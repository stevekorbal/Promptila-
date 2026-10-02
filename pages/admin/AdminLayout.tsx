import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar.tsx';
import AdminTopBar from '../../components/admin/AdminTopBar.tsx';
import { fetchAdminAlerts } from '../../lib/adminAlertsService.ts';

export const AdminLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const location = useLocation();

  useEffect(() => {
    let isCancelled = false;
    fetchAdminAlerts()
      .then((res) => {
        if (!isCancelled) {
          setAlertsCount(res.alerts.length);
        }
      })
      .catch((err) => {
        console.error('Error fetching admin alerts count:', err);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Get active title based on path
  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/admin') {
      return { title: 'Overview', subtitle: 'Business performance and system activity at a glance' };
    }
    if (path.startsWith('/admin/audits')) {
      return { title: 'Audits', subtitle: 'AI Visibility audit requests, scores, and generated reports' };
    }
    if (path.startsWith('/admin/customers')) {
      return { title: 'Customers', subtitle: 'Verified business accounts and domain portfolios' };
    }
    if (path.startsWith('/admin/blueprint-orders')) {
      return { title: 'Blueprint Orders', subtitle: 'Self-paced $297 Blueprint sales and automated delivery' };
    }
    if (path.startsWith('/admin/dfy-orders')) {
      return { title: 'DFY Orders', subtitle: 'Turnkey $999 Done-For-You optimization pipeline' };
    }
    if (path.startsWith('/admin/emails')) {
      return { title: 'Email Activity', subtitle: 'Automated notification sequences and webhook logs' };
    }
    if (path.startsWith('/admin/alerts')) {
      return { title: 'System Alerts', subtitle: 'Issues requiring staff resolution and workflow status' };
    }
    if (path.startsWith('/admin/settings')) {
      return { title: 'Settings', subtitle: 'System configurations, webhooks, and administrative team' };
    }
    return { title: 'Admin', subtitle: 'Promptila Internal Operations' };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased text-slate-800">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0 z-40">
        <AdminSidebar alertsCount={alertsCount} />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-white h-full z-10 shadow-xl">
            <AdminSidebar 
              onCloseMobile={() => setMobileSidebarOpen(false)}
              alertsCount={alertsCount}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar
          title={title}
          subtitle={subtitle}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          alertsCount={alertsCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1560px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
