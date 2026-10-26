import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CustomerSidebar from '../../components/customer/CustomerSidebar.tsx';
import CustomerTopBar from '../../components/customer/CustomerTopBar.tsx';

export const CustomerLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Get active title and subtitle based on customer path
  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/dashboard/') {
      return { 
        title: 'Overview', 
        subtitle: 'Your AI visibility performance and optimization progress' 
      };
    }
    if (path.startsWith('/dashboard/audit')) {
      return { 
        title: 'My Audit', 
        subtitle: 'Your detailed AI visibility score and diagnostic report' 
      };
    }
    if (path.startsWith('/dashboard/blueprint')) {
      return { 
        title: 'My Blueprint', 
        subtitle: 'Personalized AI search implementation framework and templates' 
      };
    }
    if (path.startsWith('/dashboard/recommendations')) {
      return { 
        title: 'Recommendations', 
        subtitle: 'Step-by-step checklist to increase your AI search recommendations' 
      };
    }
    if (path.startsWith('/dashboard/progress')) {
      return { 
        title: 'Progress', 
        subtitle: 'Visibility score trajectory and completed optimization milestones' 
      };
    }
    if (path.startsWith('/dashboard/dfy')) {
      return { 
        title: 'DFY Optimization', 
        subtitle: 'Turnkey execution handled directly by Promptila AI search specialists' 
      };
    }
    if (path.startsWith('/dashboard/monitoring')) {
      return { 
        title: 'Monthly Monitoring', 
        subtitle: 'Continuous surveillance across ChatGPT, Gemini, Perplexity, and Claude' 
      };
    }
    if (path.startsWith('/dashboard/account')) {
      return { 
        title: 'Account Settings', 
        subtitle: 'Manage your profile, business details, and billing settings' 
      };
    }
    return { 
      title: 'Customer Dashboard', 
      subtitle: 'AI Search Optimization for B2B' 
    };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased text-slate-800">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0 z-40">
        <CustomerSidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-white h-full z-10 shadow-xl">
            <CustomerSidebar 
              onCloseMobile={() => setMobileSidebarOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <CustomerTopBar
          title={title}
          subtitle={subtitle}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1560px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
