import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Construction, ExternalLink } from 'lucide-react';
import EmptyState from '../../components/admin/EmptyState.tsx';

interface AdminPlaceholderProps {
  sectionTitle?: string;
  sectionDescription?: string;
}

export const AdminPlaceholder: React.FC<AdminPlaceholderProps> = ({
  sectionTitle,
  sectionDescription
}) => {
  const location = useLocation();
  const path = location.pathname;

  const getSectionDetails = () => {
    if (path.includes('audits')) {
      return {
        title: 'Audits Management',
        desc: 'Review incoming audit requests, trigger n8n automated audits, and inspect AI Visibility dossiers.',
        badge: 'Audits Module'
      };
    }
    if (path.includes('customers')) {
      return {
        title: 'Customer Directory',
        desc: 'Directory of registered businesses, customer domains, and stakeholder contact channels.',
        badge: 'Customers Module'
      };
    }
    if (path.includes('blueprint-orders')) {
      return {
        title: 'Blueprint Orders ($297)',
        desc: 'DIY Blueprint orders, Stripe payment verification, and deliverable download logs.',
        badge: 'Orders Module'
      };
    }
    if (path.includes('dfy-orders')) {
      return {
        title: 'DFY Optimization Orders ($999)',
        desc: 'Turnkey Done-For-You enterprise service accounts, kickoff dates, and analyst assignments.',
        badge: 'Fulfillment Module'
      };
    }
    if (path.includes('emails')) {
      return {
        title: 'Automated Email Sequences',
        desc: 'Email activity log, open rates, delivery statuses, and automated follow-up sequences.',
        badge: 'Email Module'
      };
    }
    if (path.includes('alerts')) {
      return {
        title: 'System Alerts & Exceptions',
        desc: 'All pending workflow exceptions, failed synthesis retries, and customer follow-up tasks.',
        badge: 'Alerts Module'
      };
    }
    if (path.includes('settings')) {
      return {
        title: 'Admin Settings & Integrations',
        desc: 'Stripe gateway configuration, n8n webhook webhooks, and administrative role assignments.',
        badge: 'Settings Module'
      };
    }
    return {
      title: sectionTitle || 'Admin Section',
      desc: sectionDescription || 'This module will be connected to Promptila database tables in the upcoming step.',
      badge: 'Admin Panel'
    };
  };

  const details = getSectionDetails();

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
          {details.badge}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 shadow-xs">
        <EmptyState
          icon={<Construction className="w-6 h-6 text-indigo-600" />}
          title={`${details.title} Coming in Step 2`}
          description={details.desc}
          actionText="Return to Admin Overview"
          onAction={() => window.location.href = '/admin'}
        />

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Architecture ready for Supabase live dataset binding</span>
          </div>
          <Link
            to="/admin"
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Go to Admin Overview Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminPlaceholder;
