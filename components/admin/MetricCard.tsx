import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  timeframe?: string;
  subtext?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'positive',
  timeframe = 'vs. last month',
  subtext,
  icon,
  iconBg = 'bg-slate-100',
  iconColor = 'text-slate-700',
  loading = false,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-semibold text-slate-500 tracking-tight">
          {title}
        </span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-1">
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
        ) : (
          <div className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight tabular-nums">
            {value}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100/90 flex items-center justify-between text-xs">
        {loading ? (
          <div className="h-4 w-28 bg-slate-100 animate-pulse rounded" />
        ) : change ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
                changeType === 'positive'
                  ? 'bg-emerald-50 text-emerald-700'
                  : changeType === 'negative'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {changeType === 'positive' && <TrendingUp className="w-3 h-3" />}
              {changeType === 'negative' && <TrendingDown className="w-3 h-3" />}
              {changeType === 'neutral' && <Minus className="w-3 h-3" />}
              {change}
            </span>
            <span className="text-slate-400 text-[11px]">{timeframe}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">{subtext || ''}</span>
        )}

        {!loading && subtext && change && (
          <span className="text-slate-400 text-[11px] truncate max-w-[120px] text-right" title={subtext}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
