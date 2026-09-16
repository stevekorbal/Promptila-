import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<Props> = ({ children }) => {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Verifying administrator privileges...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> go to login
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Logged in, but not an admin -> Strictly block access and redirect to user dashboard
  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 pt-24 pb-16">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            The administrator panel is restricted to verified Promptila staff. Your account (<span className="font-semibold text-slate-900">{user.email}</span>) holds client-level privileges (<span className="font-mono text-xs text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded font-bold">role: {role || 'user'}</span>).
          </p>
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-md text-sm"
            >
              Return to My Client Dashboard
            </Link>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
