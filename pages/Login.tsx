import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Sparkles, AlertCircle, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, setMockSession, isConfigured, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const { error, data } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || 'Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check where to navigate based on role or redirectPath
      const target = redirectPath || (email.toLowerCase().includes('admin') ? '/admin' : '/dashboard');
      navigate(target, { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during sign in.');
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoRole: 'user' | 'admin') => {
    setMockSession(demoRole);
    if (demoRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="pt-28 pb-24 bg-slate-50 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Prompt<span className="text-indigo-600">ila</span>
            </span>
            <span className="text-[10px] font-bold tracking-widest text-indigo-700 uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              Portal
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Promptila
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your AI search visibility dashboard, audit reports, and tracking
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-100/60">
          {!isConfigured && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
              <div className="flex items-center space-x-2 font-bold mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Supabase Setup Notice</span>
              </div>
              <p className="text-amber-800 leading-relaxed mb-2">
                Set <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-semibold">SUPABASE_URL</code> and <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-semibold">SUPABASE_PUBLISHABLE_KEY</code> in project settings to connect your live Supabase database.
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                <span className="font-medium text-amber-900">Test with sample roles:</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('user')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-2xs"
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Authentication failed: </span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.99] shadow-lg shadow-indigo-600/20 disabled:opacity-70 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don't have an account yet?{' '}
              <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-8 flex items-center justify-center space-x-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected by Supabase Auth with Row Level Security (RLS)</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
