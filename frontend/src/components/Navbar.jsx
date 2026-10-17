import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, FileText, Users, LayoutDashboard, LogOut, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to={isAdmin ? "/admin" : "/books"} className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
                  Aetheria
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block -mt-1">
                  Library OS
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/admin/books"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin/books')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Manage Books
                </Link>
                <Link
                  to="/admin/articles"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin/articles')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Manage Articles
                </Link>
                <Link
                  to="/admin/members"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin/members')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Members
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/books"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/books')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Books & Translation
                </Link>
                <Link
                  to="/articles"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/articles')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Articles & Summary
                </Link>
              </>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 pl-4 border-l border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-xs font-semibold text-slate-200 border border-slate-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</p>
                <span
                  className={`inline-block text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    isAdmin
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
