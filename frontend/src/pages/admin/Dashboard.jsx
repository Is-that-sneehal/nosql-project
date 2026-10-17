import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { BookOpen, FileText, Users, PlusCircle, ArrowRight, ShieldCheck, Zap, Activity } from 'lucide-react';

export const Dashboard = () => {
  const [stats, setStats] = useState({ total_books: 0, total_articles: 0, total_members: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 mb-10 border border-gray-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-gray-900">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Operations Center
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Library Control Dashboard
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Manage your books, articles, and member directory. Monitor system health and ephemeral cache status in real-time.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Books</span>
            <p className="text-3xl font-extrabold text-white mt-1">
              {loading ? '...' : stats.total_books}
            </p>
            <Link to="/admin/books" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3">
              Manage books <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Articles</span>
            <p className="text-3xl font-extrabold text-white mt-1">
              {loading ? '...' : stats.total_articles}
            </p>
            <Link to="/admin/articles" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3">
              Manage articles <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <FileText className="w-7 h-7" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Members</span>
            <p className="text-3xl font-extrabold text-white mt-1">
              {loading ? '...' : stats.total_members}
            </p>
            <Link to="/admin/members" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium mt-3">
              View members <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Quick Action Hub & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Quick Catalog Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/books?new=true"
              className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-indigo-500/40 hover:bg-gray-800/80 transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Create New Book</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload text & cover metadata</p>
              </div>
            </Link>

            <Link
              to="/admin/articles?new=true"
              className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-violet-500/40 hover:bg-gray-800/80 transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Publish New Article</h3>
                <p className="text-xs text-slate-400 mt-0.5">Add source text & tags</p>
              </div>
            </Link>
          </div>
        </div>

        {/* System Architecture Status */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Infrastructure Status
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <span className="text-slate-300">Database Engine</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                MongoDB 7.0 Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <span className="text-slate-300">Cache / Rate Limiter</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Redis 7.2 Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <span className="text-slate-300">Translation Service</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                deep-translator (Free)
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <span className="text-slate-300">Summarizer Engine</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                sumy TextRank (Free)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
