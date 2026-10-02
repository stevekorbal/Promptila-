import React from 'react';

export type StatusType = 
  | 'completed' 
  | 'delivered' 
  | 'paid' 
  | 'succeeded' 
  | 'active'
  | 'pending' 
  | 'in_progress' 
  | 'processing' 
  | 'queued' 
  | 'failed' 
  | 'error' 
  | 'bounced' 
  | 'attention'
  | 'opened'
  | 'clicked'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label, 
  className = '',
  size = 'sm'
}) => {
  const normalized = (status || '').toLowerCase().trim();
  const displayLabel = label || status;

  // Determine styling based on semantic state
  let colorStyles = 'bg-slate-50 text-slate-700 border-slate-200/80';
  let dotColor = 'bg-slate-400';

  if (['completed', 'delivered', 'paid', 'succeeded', 'active'].includes(normalized)) {
    colorStyles = 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60';
    dotColor = 'bg-emerald-500';
  } else if (['pending', 'in_progress', 'processing', 'queued', 'opened'].includes(normalized)) {
    colorStyles = 'bg-amber-50/80 text-amber-700 border-amber-200/60';
    dotColor = 'bg-amber-500';
  } else if (['failed', 'error', 'bounced', 'attention'].includes(normalized)) {
    colorStyles = 'bg-rose-50/80 text-rose-700 border-rose-200/60';
    dotColor = 'bg-rose-500';
  } else if (['clicked', 'blueprint', 'dfy'].includes(normalized)) {
    colorStyles = 'bg-indigo-50/80 text-indigo-700 border-indigo-200/60';
    dotColor = 'bg-indigo-500';
  }

  const sizeStyles = size === 'sm' 
    ? 'text-[11px] py-0.5 px-2 font-medium' 
    : 'text-xs py-1 px-2.5 font-medium';

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-md border tracking-tight capitalize ${sizeStyles} ${colorStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
