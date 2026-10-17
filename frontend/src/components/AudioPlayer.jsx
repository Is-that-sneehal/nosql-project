import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AudioPlayer = ({ bookId, title, hasContent }) => {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const streamUrl = `${API_BASE_URL}/books/${bookId}/audio/stream`;

  // Fetch status on mount or book change
  useEffect(() => {
    let isMounted = true;
    const checkAudioStatus = async () => {
      setLoadingStatus(true);
      setAudioError(null);
      setIsPlaying(false);
      try {
        const res = await api.get(`/books/${bookId}/audio/status`);
        if (isMounted) {
          setAudioReady(Boolean(res.data?.audio_ready));
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [bookId]);

  const handleGenerateAudio = async () => {
    setGenerating(true);
    setAudioError(null);
    try {
      const res = await api.post(`/books/${bookId}/audio/generate`);
      if (res.data?.audio_ready) {
        setAudioReady(true);
        // Reset audio ref to reload stream
        if (audioRef.current) {
          audioRef.current.load();
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Failed to generate audio. Please check that book content is available.';
      setAudioError(msg);
    } finally {
      setGenerating(false);
    }
  };

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
              {audioReady && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready (Cached)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Offline text-to-speech audio reader. Synthesizes English book text into speech.
            </p>
          </div>
        </div>

        {/* Action button if audio is not yet generated */}
        {!audioReady && (
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
                <span>Generate Audio Narration</span>
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

      {/* Audio Player Controls when ready */}
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

              {/* Re-generate button */}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
