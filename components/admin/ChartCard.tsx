import React from 'react';
import { Download, SlidersHorizontal, MoreVertical } from 'lucide-react';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  actionMenu?: boolean;
  onDownload?: () => void;
  onFilter?: () => void;
  onMore?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon,
  iconBg = 'bg-emerald-50',
  iconColor = 'text-emerald-600',
  actionMenu = true,
  onDownload,
  onFilter,
  onMore,
  headerRight,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between ${className}`}>
      {/* Card Header matching reference screenshot */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
              {icon}
            </div>
          )}
          <div className="flex items-baseline gap-2 truncate">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <span className="text-xs text-slate-400 font-normal hover:text-slate-600 transition-colors cursor-pointer select-none">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right side utility icons or custom controls */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {headerRight}
          {actionMenu && (
            <>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  title="Download / Export"
                  className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              {onFilter && (
                <button
                  type="button"
                  onClick={onFilter}
                  title="Filter parameters"
                  className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onMore}
                title="Options"
                className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main card body */}
      <div className="w-full flex-grow">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
