import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import {
  Headphones,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
  Monitor,
  Mic,
  Languages,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Browser Speech Synthesis helpers
// ---------------------------------------------------------------------------

function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pick the best available voice for a language code (e.g. 'hi', 'te', 'en').
 */
function pickVoice(langCode, voiceList = []) {
  if (!voiceList || !voiceList.length) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      voiceList = window.speechSynthesis.getVoices() || [];
    }
  }
  if (!voiceList.length) return undefined;
  if (!langCode) return voiceList.find((v) => v.default) || voiceList[0];

  const code = langCode.toLowerCase();

  // Map known short codes to primary subtag prefixes
  const prefixMap = {
    hi: 'hi',
    hindi: 'hi',
    te: 'te',
    telugu: 'te',
    en: 'en',
    english: 'en',
  };
  const targetPrefix = prefixMap[code] || code;

  // 1. Exact match on normalized BCP-47 tag (e.g. hi-IN, te-IN, en-US)
  const exact = voiceList.find((v) => {
    const vLang = (v.lang || '').toLowerCase().replace('_', '-');
    return vLang.startsWith(targetPrefix + '-') || vLang === targetPrefix;
  });
  if (exact) return exact;

  // 2. Name search (some browsers name voices e.g. "Google हिन्दी" or "Microsoft Kalpana - Hindi")
  const byName = voiceList.find((v) => {
    const vName = (v.name || '').toLowerCase();
    if (targetPrefix === 'hi' && (vName.includes('hindi') || vName.includes('हिन्दी'))) return true;
    if (targetPrefix === 'te' && (vName.includes('telugu') || vName.includes('తెలుగు'))) return true;
    return false;
  });
  if (byName) return byName;

  // 3. Fallback to default or first voice
  return voiceList.find((v) => v.default) || voiceList[0];
}

// ---------------------------------------------------------------------------
// AudioPlayer Component
// ---------------------------------------------------------------------------

export const AudioPlayer = ({
  bookId,
  title,
  hasContent,
  contentText = '',
  translatedText = '',
  translatedLang = null,
}) => {
  // ---- Server audio states ----
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [audioError, setAudioError] = useState(null);

  // ---- Server playback states ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // ---- Browser narration states ----
  const [browserPlaying, setBrowserPlaying] = useState(false);
  const [browserPaused, setBrowserPaused] = useState(false);
  const [browserSupported] = useState(isSpeechSynthesisSupported);
  const [voices, setVoices] = useState([]);
  const [selectedSource, setSelectedSource] = useState('original'); // 'original' | 'translated'

  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const streamUrl = `${API_BASE_URL}/books/${bookId}/audio/stream`;

  // ---- Load speech synthesis voices asynchronously ----
  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;

    const populateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length) {
        setVoices(available);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // ---- Stop / Cancel browser speech ----
  const cancelBrowserSpeech = useCallback(() => {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setBrowserPlaying(false);
    setBrowserPaused(false);
  }, []);

  // ---- Reset / Fetch server audio status on mount or book change ----
  useEffect(() => {
    let isMounted = true;
    const checkAudioStatus = async () => {
      setLoadingStatus(true);
      setAudioError(null);
      setIsPlaying(false);
      setAudioReady(false);
      setTtsAvailable(false);
      setSelectedSource('original');
      cancelBrowserSpeech();

      try {
        const res = await api.get(`/books/${bookId}/audio/status`);
        if (isMounted) {
          setAudioReady(Boolean(res.data?.audio_ready));
          setTtsAvailable(Boolean(res.data?.tts_available));
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to query audio status:', err);
        }
      } finally {
        if (isMounted) {
          setLoadingStatus(false);
        }
      }
    };

    if (bookId) {
      checkAudioStatus();
    }

    return () => {
      isMounted = false;
      cancelBrowserSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [bookId, cancelBrowserSpeech]);

  // When translatedText becomes newly available, switch to it if user hasn't started playing
  useEffect(() => {
    if (translatedText && !browserPlaying) {
      setSelectedSource('translated');
    }
  }, [translatedText, browserPlaying]);

  // ---- Server audio: generate ----
  const handleGenerateAudio = async () => {
    setGenerating(true);
    setAudioError(null);
    try {
      const res = await api.post(`/books/${bookId}/audio/generate`);
      if (res.data?.audio_ready) {
        setAudioReady(true);
        if (audioRef.current) {
          audioRef.current.load();
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Server-side audio generation is unavailable on this deployment. Please use browser speech narration.';
      setAudioError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ---- Server audio: playback controls ----
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Audio play error:', err);
        setAudioError('Playback failed. Please try again.');
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e) => {
    const target = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ---- Browser narration logic ----
  const activeText =
    selectedSource === 'translated' && translatedText
      ? translatedText
      : contentText;

  const activeLangCode =
    selectedSource === 'translated' && translatedLang
      ? translatedLang
      : 'en';

  const startBrowserNarration = (overrideLang = null, overrideText = null) => {
    const textToSpeak = overrideText || activeText;
    const langToUse = overrideLang || activeLangCode;

    if (!browserSupported || !textToSpeak?.trim()) {
      setAudioError('No text content available to narrate.');
      return;
    }

    setAudioError(null);
    cancelBrowserSpeech();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Set BCP-47 language tag
    if (langToUse === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (langToUse === 'te') {
      utterance.lang = 'te-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Pick best matching voice
    const matchedVoice = pickVoice(langToUse, voices);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }

    utterance.onend = () => {
      setBrowserPlaying(false);
      setBrowserPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.error('SpeechSynthesis error:', e);
        setAudioError(`Speech synthesis error: ${e.error || 'Playback stopped'}`);
      }
      setBrowserPlaying(false);
      setBrowserPaused(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setBrowserPlaying(true);
    setBrowserPaused(false);
  };

  const pauseBrowserNarration = () => {
    if (browserSupported && browserPlaying) {
      window.speechSynthesis.pause();
      setBrowserPaused(true);
    }
  };

  const resumeBrowserNarration = () => {
    if (browserSupported && browserPaused) {
      window.speechSynthesis.resume();
      setBrowserPaused(false);
    }
  };

  const stopBrowserNarration = () => {
    cancelBrowserSpeech();
  };

  // Active voice label for UI display
  const currentVoice = pickVoice(activeLangCode, voices);
  const voiceLabel = currentVoice
    ? `${currentVoice.name} (${currentVoice.lang})`
    : activeLangCode === 'hi'
      ? 'Hindi (System Native)'
      : activeLangCode === 'te'
        ? 'Telugu (System Native)'
        : 'Default Browser Voice';

  const showBrowserFallback = !audioReady && !loadingStatus;

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-indigo-500/20 mb-8 bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/20 shadow-xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Headphones className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Audio Narration (TTS)
              </h3>
              {audioReady ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Server Audio (Cached)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  <Mic className="w-3 h-3" />
                  Browser Narration Fallback
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {audioReady
                ? 'Streaming server-generated audio narration.'
                : browserSupported
                  ? 'Narrate text aloud using browser Web Speech API (supports English, Hindi, Telugu).'
                  : 'Text-to-speech audio reader for book content.'}
            </p>
          </div>
        </div>

        {/* Server generate button — only when TTS engine is available on backend and audio not ready */}
        {!audioReady && ttsAvailable && (
          <button
            onClick={handleGenerateAudio}
            disabled={generating || loadingStatus || !hasContent}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Synthesizing Voice...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Server Audio</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error alert */}
      {audioError && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* Server Audio Player Controls (when server WAV is ready)            */}
      {/* ================================================================== */}
      {audioReady && (
        <div className="space-y-4 pt-2 relative z-10">
          <audio
            ref={audioRef}
            src={streamUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />

          {/* Source badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Monitor className="w-3 h-3" />
              Server-Generated WAV
            </span>
          </div>

          {/* Progress Bar & Seek */}
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Player controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Play, Pause, Restart */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={handleRestart}
                className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-slate-300 hover:text-white transition-colors"
                title="Restart Audio"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-300 text-xs font-medium border border-indigo-500/20">
                <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse text-indigo-400' : 'text-slate-500'}`} />
                <span>{isPlaying ? 'Playing Audio' : 'Paused'}</span>
              </div>
            </div>

            {/* Volume control & Download & Re-synthesize */}
            <div className="flex items-center gap-4">
              {/* Volume Slider */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Download WAV button */}
              <a
                href={streamUrl}
                download={`book_${bookId}.wav`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-slate-200 hover:text-white text-xs font-semibold border border-gray-700 transition-colors"
                title="Download Audio File"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* Re-generate button (if TTS is available on server) */}
              {ttsAvailable && (
                <button
                  onClick={handleGenerateAudio}
                  disabled={generating}
                  className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                  title="Re-synthesize Audio"
                >
                  {generating ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Browser Narration Fallback (when server audio is NOT ready)        */}
      {/* ================================================================== */}
      {showBrowserFallback && browserSupported && hasContent && (
        <div className="space-y-4 pt-2 relative z-10">
          {/* Source selection tabs (Original vs Translated) if translation is available */}
          {translatedText && (
            <div className="flex items-center gap-2 mb-2 p-1 bg-slate-900/80 rounded-xl border border-gray-800 w-fit">
              <button
                onClick={() => {
                  if (browserPlaying) cancelBrowserSpeech();
                  setSelectedSource('original');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedSource === 'original'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Original (English)
              </button>
              <button
                onClick={() => {
                  if (browserPlaying) cancelBrowserSpeech();
                  setSelectedSource('translated');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedSource === 'translated'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Languages className="w-3 h-3" />
                <span>
                  Translated ({translatedLang === 'hi' ? 'Hindi' : translatedLang === 'te' ? 'Telugu' : translatedLang?.toUpperCase()})
                </span>
              </button>
            </div>
          )}

          {/* Voice indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-violet-400" />
              Voice: <span className="text-slate-200 font-medium">{voiceLabel}</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {activeText.length} characters
            </span>
          </div>

          {/* Browser narration controls */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!browserPlaying ? (
              <button
                onClick={() => startBrowserNarration()}
                className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/40 hover:scale-105 active:scale-95 transition-all"
                title="Start Narration"
              >
                <Play className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <>
                {browserPaused ? (
                  <button
                    onClick={resumeBrowserNarration}
                    className="w-12 h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/40 hover:scale-105 active:scale-95 transition-all"
                    title="Resume Narration"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={pauseBrowserNarration}
                    className="w-12 h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/40 hover:scale-105 active:scale-95 transition-all"
                    title="Pause Narration"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={stopBrowserNarration}
                  className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                  title="Stop Narration"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-300 text-xs font-medium border border-violet-500/20">
              <Radio className={`w-3.5 h-3.5 ${browserPlaying && !browserPaused ? 'animate-pulse text-violet-400' : 'text-slate-500'}`} />
              <span>
                {browserPlaying
                  ? browserPaused
                    ? 'Narration Paused'
                    : selectedSource === 'translated'
                      ? `Narrating Translation (${translatedLang === 'hi' ? 'Hindi' : 'Telugu'})...`
                      : 'Narrating Original...'
                  : 'Ready to Narrate'}
              </span>
            </div>

            {/* Restart narration */}
            {browserPlaying && (
              <button
                onClick={() => {
                  cancelBrowserSpeech();
                  setTimeout(() => startBrowserNarration(), 100);
                }}
                className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-slate-300 hover:text-white transition-colors"
                title="Restart from Beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback message when Web Speech API is not supported */}
      {showBrowserFallback && !browserSupported && (
        <div className="pt-2 relative z-10">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Audio narration is not available. Your browser does not support the Web Speech API
              and this server does not have a TTS engine installed.
            </span>
          </div>
        </div>
      )}

      {/* No content message */}
      {showBrowserFallback && !hasContent && (
        <div className="pt-2 relative z-10">
          <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This book has no text content available for narration.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
