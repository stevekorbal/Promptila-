import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  Plus, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Link } from 'react-router-dom';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  onToggleMobileSidebar?: () => void;
  alertsCount?: number;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  title,
  subtitle,
  onToggleMobileSidebar,
  alertsCount = 4,
  onSearchChange,
  searchPlaceholder = 'Search audits, orders, customers...'
}) => {
  const { user, profile } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Sarah Miley');

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
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 font-normal hidden sm:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Middle/Right: Global search & Action icons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Bar with keyboard shortcut hint */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchVal}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-12 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* System Status indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-[11px] font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Live</span>
        </div>

        {/* Notifications / Alerts icon */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="System notifications"
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            {alertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                <span className="text-[10px] text-slate-400 font-medium">{alertsCount} items</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900">
                  <p className="font-semibold text-[11px]">AUD-100012 Blueprint failure</p>
                  <p className="text-[10px] text-rose-700 mt-0.5">Automated prompt synthesis retry timed out.</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-amber-900">
                  <p className="font-semibold text-[11px]">AUD-100009 Delivery bounce</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">Corporate mailserver rejected webhook payload.</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700">
                  <p className="font-semibold text-[11px]">New DFY Order received</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Acme Legal Services ($999 paid).</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                <Link
                  to="/admin/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View All Alerts →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin profile control (compact top bar version) */}
        <div className="flex items-center pl-2 border-l border-slate-200">
          <Link
            to="/admin/settings"
            className="flex items-center gap-2 p-1 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <img
              src="/avatar_admin_user.jpg"
              alt={displayName}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
            <span className="text-xs font-semibold hidden sm:inline-block max-w-[100px] truncate">
              {displayName}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
