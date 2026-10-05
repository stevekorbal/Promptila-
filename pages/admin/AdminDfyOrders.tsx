import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowLeft } from 'lucide-react';

export const AdminDfyOrders: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Return link */}
      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* Clean Intentional Empty-State Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-8 sm:p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6" />
        </div>

        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Not Connected
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          No DFY orders yet
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed max-w-md mb-2">
          Done-For-You Optimization orders will appear here once the $999 DFY purchase and fulfillment system is connected.
        </p>

        <p className="text-[11px] text-slate-400 max-w-sm mb-6">
          The Admin module is ready for future Stripe and fulfillment integration.
        </p>

        <Link
          to="/admin"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          Return to Admin Overview
        </Link>
      </div>
    </div>
  );
};

export default AdminDfyOrders;
