import React, { useState } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileSearch, 
  FileCode, 
  ListChecks, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  User, 
  LogOut, 
  ChevronsUpDown, 
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface CustomerSidebarProps {
  onCloseMobile?: () => void;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({ onCloseMobile }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 1. MAIN Navigation Items
  const mainNavItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'My Audit',
      path: '/dashboard/audit',
      icon: FileSearch,
    },
    {
      name: 'My Blueprint',
      path: '/dashboard/blueprint',
      icon: FileCode,
    },
    {
      name: 'Recommendations',
      path: '/dashboard/recommendations',
      icon: ListChecks,
    },
    {
      name: 'Progress',
      path: '/dashboard/progress',
      icon: TrendingUp,
    },
  ];

  // 2. SERVICES Navigation Items
  const servicesNavItems = [
    {
      name: 'DFY Optimization',
      path: '/dashboard/dfy',
      icon: Sparkles,
      badge: '$999',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    },
    {
      name: 'Monitoring',
      path: '/dashboard/monitoring',
      icon: Activity,
      badge: '$99/mo',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    },
  ];

  // 3. OTHER Navigation Items
  const otherNavItems = [
    {
      name: 'Account',
      path: '/dashboard/account',
      icon: User,
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

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Client Account');
  const displayEmail = user?.email || 'client@example.com';
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <aside className="w-64 h-full bg-[#f8fafc] border-r border-slate-200/80 flex flex-col justify-between select-none">
      {/* Top Header & Brand (Client Branding: Promptila without Admin badge) */}
      <div>
        <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between">
          <Link 
            to="/dashboard" 
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
                        ? 'bg-white text-indigo-600 font-semibold shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* SERVICES Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Services
            </div>
            <nav className="space-y-1">
              {servicesNavItems.map((item) => {
                const isItemActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isItemActive
                        ? 'bg-white text-indigo-600 font-semibold shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
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
                        ? 'bg-white text-indigo-600 font-semibold shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isItemActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* User Account / Profile Area at Bottom (Matching Admin layout) */}
      <div className="p-3 border-t border-slate-200/80 relative">
        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 z-50 text-xs">
            <Link
              to="/dashboard/account"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Account Settings</span>
            </Link>
            <Link
              to="/"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Public Website</span>
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

        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white hover:shadow-xs hover:border hover:border-slate-200/80 transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {displayEmail}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      </div>
    </aside>
  );
};

export default CustomerSidebar;
