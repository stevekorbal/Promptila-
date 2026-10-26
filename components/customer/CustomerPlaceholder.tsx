import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileSearch, 
  FileCode, 
  ListChecks, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  User, 
  ArrowLeft,
  Sparkle
} from 'lucide-react';

interface CustomerPlaceholderProps {
  title: string;
  description: string;
  icon?: 'audit' | 'blueprint' | 'recommendations' | 'progress' | 'dfy' | 'monitoring' | 'account';
  badge?: string;
}

export const CustomerPlaceholder: React.FC<CustomerPlaceholderProps> = ({
  title,
  description,
  icon = 'audit',
  badge = 'Coming Soon in Next Phase',
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'audit':
        return <FileSearch className="w-8 h-8 text-indigo-600" />;
      case 'blueprint':
        return <FileCode className="w-8 h-8 text-indigo-600" />;
      case 'recommendations':
        return <ListChecks className="w-8 h-8 text-indigo-600" />;
      case 'progress':
        return <TrendingUp className="w-8 h-8 text-indigo-600" />;
      case 'dfy':
        return <Sparkles className="w-8 h-8 text-indigo-600" />;
      case 'monitoring':
        return <Activity className="w-8 h-8 text-emerald-600" />;
      case 'account':
      default:
        return <User className="w-8 h-8 text-slate-700" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
        {getIcon()}
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 mb-3 border border-slate-200">
        <Sparkle className="w-3 h-3 text-indigo-600" />
        <span>{badge}</span>
      </div>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
        {title}
      </h2>

      <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Overview</span>
        </Link>
      </div>
    </div>
  );
};

export default CustomerPlaceholder;
