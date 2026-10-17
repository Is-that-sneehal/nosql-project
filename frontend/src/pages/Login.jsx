import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/books');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0B0F19]">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/25">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to your Aetheria Library account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-Fill */}
        <div className="mt-8 pt-6 border-t border-gray-800/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center mb-3">
            Quick Fill Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin@library.com', 'admin123')}
              className="py-2 px-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-[11px] font-medium text-indigo-300 transition-colors"
            >
              Demo Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('member@library.com', 'member123')}
              className="py-2 px-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-[11px] font-medium text-emerald-300 transition-colors"
            >
              Demo Member
            </button>
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
            Register as Member
          </Link>
        </p>
      </div>
    </div>
  );
};
