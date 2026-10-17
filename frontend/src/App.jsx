import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Admin Pages
import { Dashboard } from './pages/admin/Dashboard';
import { BookManager } from './pages/admin/BookManager';
import { ArticleManager } from './pages/admin/ArticleManager';
import { MemberList } from './pages/admin/MemberList';

// Member Pages
import { BookCatalog } from './pages/member/BookCatalog';
import { BookDetail } from './pages/member/BookDetail';
import { ArticleCatalog } from './pages/member/ArticleCatalog';
import { ArticleDetail } from './pages/member/ArticleDetail';

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/books'} replace />;
};

export const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/books" element={<BookManager />} />
                <Route path="/admin/articles" element={<ArticleManager />} />
                <Route path="/admin/members" element={<MemberList />} />
              </Route>

              {/* Member Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['member']} />}>
                <Route path="/books" element={<BookCatalog />} />
                <Route path="/books/:id" element={<BookDetail />} />
                <Route path="/articles" element={<ArticleCatalog />} />
                <Route path="/articles/:id" element={<ArticleDetail />} />
              </Route>

              {/* Root & Catch-all */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
