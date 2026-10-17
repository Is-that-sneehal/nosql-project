"""
Summarization service using sumy's TextRank algorithm.
"""

import asyncio

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer


def _summarize_sync(text: str, sentence_count: int) -> str:
    """Synchronous extractive summarization."""
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = TextRankSummarizer()
    summary_sentences = summarizer(parser.document, sentences_count=sentence_count)
    return " ".join(str(sentence) for sentence in summary_sentences)


async def summarize_text(text: str, sentence_count: int = 4) -> str:
    """
    Generate an extractive summary of the given text.
    Returns the top `sentence_count` sentences ranked by TextRank.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _summarize_sync, text, sentence_count)
