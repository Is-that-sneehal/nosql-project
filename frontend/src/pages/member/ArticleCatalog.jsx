import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ArticleCard } from '../../components/ArticleCard';
import { Pagination } from '../../components/Pagination';
import { FileText, Search, Sparkles } from 'lucide-react';

export const ArticleCatalog = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/articles?q=${encodeURIComponent(search)}&page=${page}&limit=6`);
      setArticles(res.data.articles);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load articles catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-10 mb-10 border border-gray-800 bg-gradient-to-br from-violet-950/40 via-slate-900 to-[#0B0F19]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI Extractive Summarization
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Scientific & Research Articles
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Stay informed with top papers and research essays. Extract core findings instantly using our zero-cost TextRank summarizer.
          </p>

          {/* Search bar */}
          <div className="mt-6 flex items-center gap-3 glass-panel p-2.5 rounded-2xl border border-gray-700/60 max-w-xl shadow-lg">
            <Search className="w-5 h-5 text-violet-400 ml-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title or topic tag..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="absolute -right-10 -top-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading articles...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-gray-800">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No articles found</h3>
          <p className="text-xs text-slate-400 mt-1">Try searching for other keywords</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
