import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { FileText, Sparkles, ArrowLeft, Tag, Calendar, Zap, AlertCircle, Quote } from 'lucide-react';

export const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Summarization states
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/articles/${id}`);
        setArticle(res.data);
      } catch (err) {
        console.error('Failed to load article:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummaryError(null);
    try {
      const res = await api.get(`/articles/${id}/summarize`);
      setSummaryResult(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setSummaryError('Rate limit reached (20 requests/hour). Please wait before requesting another summary.');
      } else {
        setSummaryError(err.response?.data?.detail || 'Summarization failed. Please try again.');
      }
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Article Not Found</h2>
        <Link to="/articles" className="text-xs text-violet-400 hover:underline">
          Return to article catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          to="/articles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Link>
      </div>

      {/* Article Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-800 mb-8">
        <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
          <span className="font-semibold text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
            {article.source || 'Journal Publication'}
          </span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
          {article.title}
        </h1>

        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800/80">
            {article.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 bg-gray-900/80 px-2.5 py-1 rounded-lg border border-gray-800"
              >
                <Tag className="w-3 h-3 text-violet-400" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summarize Action Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Key Takeaways</h3>
            <p className="text-xs text-slate-400">
              Run sumy's TextRank summarizer to extract the core 4 sentences instantly on CPU.
            </p>
          </div>
        </div>

        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
        >
          {summarizing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Analyzing TextRank...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Summary</span>
            </>
          )}
        </button>
      </div>

      {/* Error alert */}
      {summaryError && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{summaryError}</span>
        </div>
      )}

      {/* Summary Result Box */}
      {summaryResult && (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-slate-900 to-gray-900 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-4">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-wider">
              <Quote className="w-4 h-4" />
              <span>Executive Summary</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                summaryResult.cached
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {summaryResult.cached ? (
                <>
                  <Zap className="w-2.5 h-2.5" />
                  Cached in Redis
                </>
              ) : (
                <>
                  <Sparkles className="w-2.5 h-2.5" />
                  TextRank Extracted
                </>
              )}
            </span>
          </div>
          <p className="text-violet-100 text-sm sm:text-base leading-relaxed font-sans italic">
            "{summaryResult.summary}"
          </p>
        </div>
      )}

      {/* Full Article Content */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-gray-800">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-gray-800 mb-6">
          <FileText className="w-4 h-4 text-slate-400" />
          Full Article Content
        </h2>
        <div className="text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 font-serif">
          {article.content_text}
        </div>
      </div>
    </div>
  );
};
