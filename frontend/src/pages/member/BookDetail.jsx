import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { BookOpen, Globe2, ArrowLeft, User, Sparkles, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { AudioPlayer } from '../../components/AudioPlayer';


export const BookDetail = () => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  // Translation states
  const [selectedLang, setSelectedLang] = useState('hi');
  const [translating, setTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [translationError, setTranslationError] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await api.get(`/books/${id}`);
        setBook(res.data);
      } catch (err) {
        console.error('Failed to load book:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const handleTranslate = async () => {
    setTranslating(true);
    setTranslationError(null);
    try {
      const res = await api.get(`/books/${id}/translate?lang=${selectedLang}`);
      setTranslationResult(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setTranslationError('Rate limit reached (20 requests/hour). Please wait before requesting another translation.');
      } else {
        setTranslationError(err.response?.data?.detail || 'Translation service temporarily unavailable. Please try again.');
      }
    } finally {
      setTranslating(false);
    }
  };

  const getLanguageName = (code) => {
    switch (code) {
      case 'hi':
        return 'Hindi (हिन्दी)';
      case 'te':
        return 'Telugu (తెలుగు)';
      default:
        return code.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Opening reader...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Book Not Found</h2>
        <Link to="/books" className="text-xs text-indigo-400 hover:underline">
          Return to book catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          to="/books"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>

      {/* Book Metadata Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-800 mb-8 flex flex-col md:flex-row gap-6 items-start">
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-32 sm:w-40 h-48 sm:h-56 object-cover rounded-2xl shadow-2xl border border-gray-700 shrink-0"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            {book.genre || 'Literature'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {book.title}
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-300 mt-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span className="font-medium">{book.author}</span>
          </div>
          {book.description && (
            <p className="text-xs sm:text-sm text-slate-400 mt-4 leading-relaxed max-w-3xl">
              {book.description}
            </p>
          )}
        </div>
      </div>

      {/* Offline Audio (TTS) Player */}
      <AudioPlayer
        bookId={id}
        title={book.title}
        hasContent={Boolean(book.content_text)}
      />

      {/* Translation Toolbar */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Translate Reader</h3>
            <p className="text-xs text-slate-400">
              Translate the excerpt on-demand via the free neural translation engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="te">Telugu (తెలుగు)</option>
          </select>

          <button
            onClick={handleTranslate}
            disabled={translating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {translating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Translating Chunks...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Translate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {translationError && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{translationError}</span>
        </div>
      )}

      {/* Reading Panes: Side by side or Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Original Content */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-800">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              Original Text (English)
            </h2>
            <span className="text-[11px] text-slate-500">
              {book.content_text?.length || 0} characters
            </span>
          </div>
          <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-serif space-y-4">
            {book.content_text}
          </div>
        </div>

        {/* Translated Content */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-800 relative">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-indigo-400" />
              Translation ({getLanguageName(selectedLang)})
            </h2>

            {translationResult && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  translationResult.cached
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {translationResult.cached ? (
                  <>
                    <Zap className="w-2.5 h-2.5" />
                    Cached in Redis
                  </>
                ) : (
                  <>
                    <Sparkles className="w-2.5 h-2.5" />
                    Deep-Translator Engine
                  </>
                )}
              </span>
            )}
          </div>

          {translating ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Processing chunks with retry backoff...</p>
            </div>
          ) : translationResult ? (
            <div className="text-indigo-100 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-serif space-y-4">
              {translationResult.translated_text}
            </div>
          ) : (
            <div className="py-24 text-center text-slate-600">
              <Globe2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-xs text-slate-400">
                Select your preferred regional language above and click "Translate" to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
