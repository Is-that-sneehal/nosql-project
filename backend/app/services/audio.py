"""
Audio (Text-to-Speech) service using pyttsx3 / Windows SAPI5.
Generates offline .wav files cached on disk.

On Linux or when pyttsx3 is not installed, server-side audio generation
is gracefully disabled while the frontend falls back to browser-native
Web Speech API narration.
"""

import asyncio
import importlib
import os
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Dynamic pyttsx3 loader — prevents PyLance missing-import errors
# when optional Windows TTS dependencies are not installed in the environment.
# ---------------------------------------------------------------------------

_pyttsx3_module: Optional[Any] = None
_PYTTSX3_AVAILABLE: bool = False

try:
    _pyttsx3_module = importlib.import_module("pyttsx3")
    _PYTTSX3_AVAILABLE = True
except Exception:
    _pyttsx3_module = None
    _PYTTSX3_AVAILABLE = False


def is_tts_available() -> bool:
    """Return True if the server can generate TTS audio files."""
    return _PYTTSX3_AVAILABLE


# ---------------------------------------------------------------------------
# Audio file paths
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# WAV generation (requires pyttsx3 + Windows SAPI5 or espeak)
# ---------------------------------------------------------------------------

def _generate_wav_sync(text: str, filepath: str):
    """Synchronous worker that invokes pyttsx3 within its thread."""
    if not _PYTTSX3_AVAILABLE or _pyttsx3_module is None:
        raise RuntimeError(
            "Server-side TTS is not available on this platform. "
            "pyttsx3 is not installed or the platform lacks a speech driver. "
            "Use browser-native narration instead."
        )

    # Windows COM initialization (safe no-op on non-Windows platforms)
    pythoncom: Optional[Any] = None
    try:
        pythoncom = importlib.import_module("pythoncom")
        pythoncom.CoInitialize()
    except Exception:
        pythoncom = None

    try:
        engine = _pyttsx3_module.init()
        engine.setProperty("rate", 160)
        engine.setProperty("volume", 1.0)
        engine.save_to_file(text, filepath)
        engine.runAndWait()
        engine.stop()
    finally:
        if pythoncom is not None:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass


async def generate_book_audio(book_id: str, text: str) -> str:
    """
    Generate book audio on disk asynchronously using a thread.
    Returns the file path.

    Raises RuntimeError if pyttsx3 is not available on this platform.
    """
    if not _PYTTSX3_AVAILABLE:
        raise RuntimeError(
            "Server-side TTS is not available. "
            "pyttsx3 is not installed or the platform lacks a speech driver."
        )

    filepath = get_audio_filepath(book_id)
    if is_audio_ready(book_id):
        return filepath

    # Run in thread to keep FastAPI event loop non-blocking
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
