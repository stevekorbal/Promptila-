import React, { useState } from 'react';
import { Menu, User, LogOut, ExternalLink, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';

interface CustomerTopBarProps {
  title: string;
  subtitle?: string;
  onToggleMobileSidebar?: () => void;
}

export const CustomerTopBar: React.FC<CustomerTopBarProps> = ({
  title,
  subtitle,
  onToggleMobileSidebar,
}) => {
  const { user, profile, signOut } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navigate = useNavigate();

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Client');
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile trigger & Page title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Link to Public Site / Audit */}
        <Link
          to="/"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Promptila.com</span>
        </Link>

        {/* User Avatar & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
              {initial}
            </div>
            <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[120px] truncate">
              {displayName}
            </span>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <Link
                to="/dashboard/account"
                onClick={() => setShowUserDropdown(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Profile</span>
              </Link>

              <Link
                to="/checkout"
                onClick={() => setShowUserDropdown(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Get DIY Blueprint</span>
              </Link>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default CustomerTopBar;
