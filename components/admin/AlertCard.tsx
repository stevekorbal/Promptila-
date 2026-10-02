import React from 'react';
import { AlertCircle, AlertTriangle, Clock, ArrowRight, RefreshCw, Send, UserX, PackageCheck } from 'lucide-react';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AdminAlert {
  id: string;
  title: string;
  description: string;
  auditId?: string;
  category: 'blueprint_generation' | 'email_delivery' | 'customer_data' | 'order_fulfillment' | 'system_workflow';
  severity: AlertSeverity;
  timestamp: string;
  actionLabel: string;
  onAction?: () => void;
}

export const AlertCard: React.FC<{
  alert: AdminAlert;
  onAction?: (alert: AdminAlert) => void;
}> = ({ alert, onAction }) => {
  const getCategoryIcon = () => {
    switch (alert.category) {
      case 'blueprint_generation':
        return <RefreshCw className="w-4 h-4 text-rose-600" />;
      case 'email_delivery':
        return <Send className="w-4 h-4 text-amber-600" />;
      case 'customer_data':
        return <UserX className="w-4 h-4 text-amber-600" />;
      case 'order_fulfillment':
        return <PackageCheck className="w-4 h-4 text-indigo-600" />;
      case 'system_workflow':
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  const getSeverityBg = () => {
    switch (alert.severity) {
      case 'critical':
        return 'bg-rose-50/60 border-rose-200/80 text-rose-900';
      case 'warning':
        return 'bg-amber-50/60 border-amber-200/80 text-amber-900';
      case 'info':
      default:
        return 'bg-slate-50 border-slate-200/80 text-slate-800';
    }
  };

  return (
    <div className={`p-3.5 rounded-xl border transition-all ${getSeverityBg()} hover:shadow-xs flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 p-1.5 bg-white rounded-lg border border-slate-200/80 shadow-xs shrink-0">
          {getCategoryIcon()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              {alert.title}
            </span>
            {alert.auditId && (
              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200/60 px-1.5 py-0.2 rounded">
                {alert.auditId}
              </span>
            )}
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {alert.timestamp}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-snug">
            {alert.description}
          </p>
        </div>
      </div>

      <div className="shrink-0 self-center">
        <button
          type="button"
          onClick={() => {
            if (alert.onAction) alert.onAction();
            if (onAction) onAction(alert);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-2xs whitespace-nowrap active:scale-98"
        >
          <span>{alert.actionLabel}</span>
          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
        </button>
      </div>
    </div>
  );
};

export default AlertCard;
