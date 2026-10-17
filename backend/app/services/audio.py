"""
Audio (Text-to-Speech) service using pyttsx3 / Windows SAPI5.
Generates offline .wav files cached on disk.
"""

import asyncio
import os
from pathlib import Path

# Resolve the shared static/audio directory
_BASE_DIR = Path(__file__).resolve().parents[2]
# Look in root static/audio or backend/static/audio
AUDIO_DIR = _BASE_DIR / "static" / "audio"
if not AUDIO_DIR.exists():
    AUDIO_DIR = _BASE_DIR.parent / "static" / "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)


def get_audio_filepath(book_id: str) -> str:
    """Return the absolute path to the cached audio file for a book."""
    return str(AUDIO_DIR / f"book_{book_id}.wav")


def is_audio_ready(book_id: str) -> bool:
    """Check if the audio file has already been generated and exists on disk."""
    path = get_audio_filepath(book_id)
    return os.path.exists(path) and os.path.getsize(path) > 0


def _generate_wav_sync(text: str, filepath: str):
    """Synchronous worker that invokes pyttsx3 within its thread."""
    try:
        import pythoncom
        pythoncom.CoInitialize()
    except Exception:
        pass

    import pyttsx3
    engine = pyttsx3.init()
    # Configure speed and voice volume
    engine.setProperty("rate", 160)
    engine.setProperty("volume", 1.0)
    engine.save_to_file(text, filepath)
    engine.runAndWait()
    engine.stop()

    try:
        import pythoncom
        pythoncom.CoUninitialize()
    except Exception:
        pass


async def generate_book_audio(book_id: str, text: str) -> str:
    """
    Generate book audio on disk asynchronously using a thread.
    Returns the file path.
    """
    filepath = get_audio_filepath(book_id)
    if is_audio_ready(book_id):
        return filepath

    # Run pyttsx3 in thread to keep FastAPI event loop non-blocking
    await asyncio.to_thread(_generate_wav_sync, text, filepath)
    return filepath


def delete_book_audio(book_id: str):
    """Remove cached audio file when book content is modified or deleted."""
    filepath = get_audio_filepath(book_id)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except OSError:
            pass
