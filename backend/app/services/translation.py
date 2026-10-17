"""
Translation service using deep-translator with chunking and retry/backoff.
"""

import asyncio
import re
from typing import List

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


def _chunk_text(text: str, max_chars: int = 3000) -> List[str]:
    """
    Split text into chunks at paragraph boundaries, capping each at max_chars.
    Falls back to sentence-level splitting if a single paragraph exceeds the limit.
    """
    paragraphs = re.split(r"\n\s*\n", text)
    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If a single paragraph exceeds max_chars, split by sentences
        if len(para) > max_chars:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sentence in sentences:
                if len(current_chunk) + len(sentence) + 1 <= max_chars:
                    current_chunk = (current_chunk + " " + sentence).strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = sentence
        elif len(current_chunk) + len(para) + 2 <= max_chars:
            current_chunk = (current_chunk + "\n\n" + para).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [text]


def _translate_with_gtx(chunk: str, target_lang: str) -> str:
    """Translate via Google client API endpoint (bypasses HTML scraping rate limits)."""
    import requests

    resp = requests.get(
        "https://translate.googleapis.com/translate_a/single",
        params={
            "client": "gtx",
            "sl": "auto",
            "tl": target_lang,
            "dt": "t",
            "q": chunk,
        },
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    translated_text = "".join(item[0] for item in data[0] if item and item[0])
    if not translated_text:
        raise ValueError("Empty translation returned from API")
    return translated_text


def _translate_with_mymemory(chunk: str, target_lang: str) -> str:
    """Fallback to MyMemoryTranslator."""
    from deep_translator import MyMemoryTranslator

    lang_map = {
        "hi": "hi-IN",
        "te": "te-IN",
        "en": "en-GB",
        "hindi": "hi-IN",
        "telugu": "te-IN",
    }
    target = lang_map.get(target_lang.lower(), target_lang)
    translator = MyMemoryTranslator(
        source="en-GB",
        target=target,
        email="library.aetheria.app@gmail.com",
    )
    # MyMemory allows up to 500 chars per query; split if needed
    sub_chunks = [chunk[i : i + 450] for i in range(0, len(chunk), 450)]
    return " ".join(translator.translate(sc) for sc in sub_chunks if sc.strip())


def _translate_with_google(chunk: str, target_lang: str) -> str:
    """Fallback to deep-translator GoogleTranslator."""
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="auto", target=target_lang)
    return translator.translate(chunk)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=6),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def _translate_chunk(chunk: str, target_lang: str) -> str:
    """
    Translate a single chunk with robust fallbacks:
    1. Google GTX API endpoint (fast, accurate, no web scrape 429 block)
    2. MyMemoryTranslator (free REST API with regional code support)
    3. Standard deep-translator GoogleTranslator
    """
    # 1. Try Google GTX API
    try:
        return _translate_with_gtx(chunk, target_lang)
    except Exception:
        pass

    # 2. Try MyMemory API
    try:
        return _translate_with_mymemory(chunk, target_lang)
    except Exception:
        pass

    # 3. Fallback to deep-translator GoogleTranslator
    return _translate_with_google(chunk, target_lang)


async def translate_text(text: str, target_lang: str) -> str:
    """
    Translate full text into the target language.
    Chunks the text to stay within Google Translate's limits,
    translates each chunk, and reassembles.
    """
    chunks = _chunk_text(text)
    loop = asyncio.get_running_loop()

    translated_chunks = []
    for chunk in chunks:
        # Run the synchronous translation in a thread pool
        translated = await loop.run_in_executor(
            None, _translate_chunk, chunk, target_lang
        )
        translated_chunks.append(translated)

    return "\n\n".join(translated_chunks)
