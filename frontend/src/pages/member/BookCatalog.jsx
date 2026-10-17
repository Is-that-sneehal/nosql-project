import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { BookCard } from '../../components/BookCard';
import { Pagination } from '../../components/Pagination';
import { BookOpen, Search, Sparkles, Globe2 } from 'lucide-react';

export const BookCatalog = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/books?q=${encodeURIComponent(search)}&page=${page}&limit=6`);
      setBooks(res.data.books);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load book catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-10 mb-10 border border-gray-800 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-[#0B0F19]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Globe2 className="w-3.5 h-3.5" />
            Multilingual Reading Experience
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore the Book Repository
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Read classical and modern literature with one-click on-demand translations into regional languages like Hindi and Telugu.
          </p>

          {/* Search bar */}
          <div className="mt-6 flex items-center gap-3 glass-panel p-2.5 rounded-2xl border border-gray-700/60 max-w-xl shadow-lg">
            <Search className="w-5 h-5 text-indigo-400 ml-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, author, or genre..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Decorative circle glow */}
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading catalog...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-gray-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No books found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
