import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { Pagination } from '../../components/Pagination';
import { FileText, Plus, Search, Edit2, Trash2, X, AlertCircle, CheckCircle, Tag } from 'lucide-react';

export const ArticleManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    tagsString: '',
    content_text: '',
  });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/articles?q=${encodeURIComponent(search)}&page=${page}&limit=8`);
      setArticles(res.data.articles);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, search]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openCreateModal();
      setSearchParams({});
    }
  }, [searchParams]);

  const openCreateModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      source: '',
      tagsString: '',
      content_text: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (article) => {
    try {
      const res = await api.get(`/articles/${article._id}`);
      const fullArticle = res.data;
      setEditingArticle(fullArticle);
      setFormData({
        title: fullArticle.title || '',
        source: fullArticle.source || '',
        tagsString: (fullArticle.tags || []).join(', '),
        content_text: fullArticle.content_text || '',
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load article details for editing:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    const tagsArray = formData.tagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title,
      source: formData.source,
      tags: tagsArray,
      content_text: formData.content_text,
    };

    try {
      if (editingArticle) {
        await api.put(`/admin/articles/${editingArticle._id}`, payload);
        setStatusMessage({ type: 'success', text: 'Article updated successfully!' });
      } else {
        await api.post('/admin/articles', payload);
        setStatusMessage({ type: 'success', text: 'Article published successfully!' });
      }
      setIsModalOpen(false);
      fetchArticles();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to save article. Please verify inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/articles/${id}`);
      setDeleteConfirmId(null);
      fetchArticles();
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-violet-400" />
            Article Catalog Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, update, or delete articles. Edits automatically invalidate cached summaries in Redis.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Publish New Article
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
          placeholder="Search articles by title or tag..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Articles Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading articles...
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No articles found. Click "Publish New Article" to add one.
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white block text-sm">{article.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-medium">{article.source || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(article.tags || []).slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(article.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(article)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                          title="Edit Article"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(article._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Article"
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
                {editingArticle ? 'Edit Article' : 'Publish New Article'}
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Article Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Advancements in Quantum Computing"
                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Source / Publication</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g. MIT Technology Review"
                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tagsString}
                  onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                  placeholder="e.g. physics, computing, AI, technology"
                  className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Article Content (Plain Text) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={formData.content_text}
                  onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                  placeholder="Paste the article text here. This text will be summarized via sumy TextRank by members..."
                  className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all font-mono"
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
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingArticle ? 'Update Article' : 'Publish Article'}
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
            <h3 className="text-base font-bold text-white">Delete Article?</h3>
            <p className="text-xs text-slate-400 mt-1">
              This will remove the article and purge any cached summaries from Redis.
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
