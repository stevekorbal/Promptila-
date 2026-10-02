import React, { useState } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileSearch, 
  Users, 
  FileCode, 
  Sparkles, 
  Mail, 
  AlertTriangle, 
  Settings, 
  LogOut, 
  ChevronsUpDown, 
  ExternalLink,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AdminSidebarProps {
  onCloseMobile?: () => void;
  alertsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  onCloseMobile,
  alertsCount = 0
}) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const mainNavItems = [
    {
      name: 'Overview',
      path: '/admin',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Audits',
      path: '/admin/audits',
      icon: FileSearch,
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
    },
    {
      name: 'Blueprint Orders',
      path: '/admin/blueprint-orders',
      icon: FileCode,
    },
    {
      name: 'DFY Orders',
      path: '/admin/dfy-orders',
      icon: Sparkles,
    },
    {
      name: 'Email Activity',
      path: '/admin/emails',
      icon: Mail,
    },
    {
      name: 'Alerts',
      path: '/admin/alerts',
      icon: AlertTriangle,
      badge: alertsCount > 0 ? alertsCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-700'
    },
  ];

  const otherNavItems = [
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Sarah Miley');
  const displayEmail = user?.email || 'admin@promptila.com';

  return (
    <aside className="w-64 h-full bg-[#f8fafc] border-r border-slate-200/80 flex flex-col justify-between select-none">
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between">
          <Link 
            to="/admin" 
            className="flex items-center gap-2.5 group"
            onClick={onCloseMobile}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:bg-indigo-600 transition-colors">
              P
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                Prompt<span className="text-indigo-600">ila</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 border border-slate-300/60">
                Admin
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6 overflow-y-auto">
          {/* MAIN Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Main
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const isItemActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isItemActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* OTHER Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Other
            </div>
            <nav className="space-y-1">
              {otherNavItems.map((item) => {
                const isItemActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isItemActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom: Admin user account control matching reference */}
      <div className="p-3 border-t border-slate-200/80 relative bg-[#f8fafc]">
        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
              <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
            </div>
            <Link
              to="/dashboard"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Switch to Client Portal</span>
            </Link>
            <Link
              to="/"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Public Website</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors mt-1"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all text-left shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/avatar_admin_user.jpg"
              alt={displayName}
              onError={(e) => {
                // Fallback if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">
                Administrator
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
