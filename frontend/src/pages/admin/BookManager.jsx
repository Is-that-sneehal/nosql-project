import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { Pagination } from '../../components/Pagination';
import { BookOpen, Plus, Search, Edit2, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';

export const BookManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    description: '',
    cover_url: '',
    content_text: '',
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/books?q=${encodeURIComponent(search)}&page=${page}&limit=8`);
      setBooks(res.data.books);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, search]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openCreateModal();
      setSearchParams({});
    }
  }, [searchParams]);

  const openCreateModal = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      genre: '',
      description: '',
      cover_url: '',
      content_text: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (book) => {
    try {
      // Fetch full book with content_text
      const res = await api.get(`/books/${book._id}`);
      const fullBook = res.data;
      setEditingBook(fullBook);
      setFormData({
        title: fullBook.title || '',
        author: fullBook.author || '',
        genre: fullBook.genre || '',
        description: fullBook.description || '',
        cover_url: fullBook.cover_url || '',
        content_text: fullBook.content_text || '',
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load book details for editing:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      if (editingBook) {
        await api.put(`/admin/books/${editingBook._id}`, formData);
        setStatusMessage({ type: 'success', text: 'Book updated successfully!' });
      } else {
        await api.post('/admin/books', formData);
        setStatusMessage({ type: 'success', text: 'Book created successfully!' });
      }
      setIsModalOpen(false);
      fetchBooks();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to save book. Please verify inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/books/${id}`);
      setDeleteConfirmId(null);
      fetchBooks();
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Book Catalog Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, update, or remove books. Content updates automatically invalidate cached translations in Redis.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Book
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-6 glass-panel p-3 rounded-2xl border border-gray-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by title, author, or genre..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Books Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-4">Title & Author</th>
                <th className="px-6 py-4">Genre</th>
                <th className="px-6 py-4">Cover</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading books...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No books found. Click "Add New Book" to create one.
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white block text-sm">{book.title}</span>
                      <span className="text-slate-400">{book.author}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium">
                        {book.genre}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt="cover"
                          className="w-8 h-10 object-cover rounded shadow border border-gray-700"
                        />
                      ) : (
                        <span className="text-slate-600 italic text-[11px]">No cover</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(book.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(book)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          title="Edit Book"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(book._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border border-gray-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
              <h2 className="text-lg font-bold text-white">
                {editingBook ? 'Edit Book' : 'Create New Book'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. The Great Gatsby"
                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. F. Scott Fitzgerald"
                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Genre *</label>
                  <input
                    type="text"
                    required
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="e.g. Classic Fiction"
                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.cover_url}
                    onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief synopsis of the book..."
                  className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Book Content (Plain Text) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={formData.content_text}
                  onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                  placeholder="Paste the full book content here. This text will be translated on-demand by members..."
                  className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-slate-300 hover:bg-gray-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingBook ? 'Update Book' : 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-gray-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Book?</h3>
            <p className="text-xs text-slate-400 mt-1">
              This action cannot be undone. All ephemeral translations in Redis will also be purged.
            </p>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-slate-300 hover:bg-gray-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
