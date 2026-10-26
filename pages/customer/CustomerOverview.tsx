import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  FileCode, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  CheckSquare, 
  Download, 
  ExternalLink, 
  FileSearch, 
  MapPin, 
  Layers, 
  MessageSquare, 
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import MetricCard from '../../components/admin/MetricCard.tsx';

// ============================================================================
// TEMPORARY DESIGN PLACEHOLDER DATA
// NOTE: These values are isolated strictly for UI design & layout review.
// They will be connected to real Supabase customer audit records in the next phase.
// ============================================================================
const DESIGN_METRICS = {
  visibilityScore: 42,
  scoreBand: 'Emerging',
  optimizationPotential: 71,
  actionsCompleted: 0,
  totalActions: 12,
};

const DESIGN_PILLARS = [
  {
    key: 'geo',
    name: 'Geographic Identity',
    score: 12,
    maxScore: 25,
    description: 'Local entity markers, address consistency & localized intent signals',
    icon: MapPin,
    color: 'amber',
  },
  {
    key: 'authority',
    name: 'Conversational Authority',
    score: 7,
    maxScore: 25,
    description: 'Third-party citations, LLM training references & niche mentions',
    icon: MessageSquare,
    color: 'rose',
  },
  {
    key: 'signals',
    name: 'Machine-Readable Signals',
    score: 13,
    maxScore: 25,
    description: 'JSON-LD schema markup, entity taxonomy & crawlability',
    icon: Layers,
    color: 'amber',
  },
  {
    key: 'validation',
    name: 'External Validation',
    score: 10,
    maxScore: 25,
    description: 'Directory parity, trusted reviews & authoritative digital footprint',
    icon: Award,
    color: 'amber',
  },
];

const DESIGN_PRIORITY_ISSUES = [
  {
    id: 'issue-1',
    title: 'Absent from non-branded AI discovery',
    priority: 'High',
    priorityColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'AI models (ChatGPT, Gemini, Perplexity) do not recommend your business when prospective clients ask for your services without your exact brand name.',
    recommendationRoute: '/dashboard/recommendations',
  },
  {
    id: 'issue-2',
    title: 'Unclear location and business identity signals',
    priority: 'Medium',
    priorityColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Discrepancies in address and service-area definitions across digital directories prevent AI models from confidently matching your business to local queries.',
    recommendationRoute: '/dashboard/recommendations',
  },
  {
    id: 'issue-3',
    title: 'Thin machine-readable entity data',
    priority: 'High',
    priorityColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Missing LocalBusiness and Service JSON-LD schema markup prevents search engines and LLM crawlers from extracting your core offerings programmatically.',
    recommendationRoute: '/dashboard/recommendations',
  },
];

const DESIGN_RECOMMENDED_ACTIONS = [
  {
    id: 'act-1',
    title: 'Improve business entity consistency',
    priority: 'High',
    status: 'Pending',
    impact: '+11 pts',
    category: 'Entity Authority',
  },
  {
    id: 'act-2',
    title: 'Add structured business information',
    priority: 'High',
    status: 'Pending',
    impact: '+9 pts',
    category: 'JSON-LD Schema',
  },
  {
    id: 'act-3',
    title: 'Strengthen service/location signals',
    priority: 'Medium',
    status: 'Pending',
    impact: '+6 pts',
    category: 'Local Search',
  },
  {
    id: 'act-4',
    title: 'Build third-party validation',
    priority: 'Medium',
    status: 'Pending',
    impact: '+5 pts',
    category: 'Citations',
  },
];

const DESIGN_RECENT_ACTIVITY = [
  {
    id: 'act-entry-1',
    title: 'Free AI Visibility Audit completed',
    timestamp: '2 days ago',
    detail: 'Initial baseline visibility score computed across ChatGPT, Gemini, and Claude.',
    icon: FileSearch,
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'act-entry-2',
    title: 'Visibility report updated',
    timestamp: 'Yesterday',
    detail: 'Detailed AI readiness evaluation generated for primary business domain.',
    icon: BarChart3,
    iconBg: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'act-entry-3',
    title: 'Optimization checklist created',
    timestamp: 'Yesterday',
    detail: '12 tailored priority actions identified to reach 71/100 potential score.',
    icon: CheckSquare,
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'act-entry-4',
    title: 'Blueprint implementation ready',
    timestamp: 'Today',
    detail: 'Personalized DIY execution guide and schema templates available for ordering.',
    icon: FileCode,
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
];

export const CustomerOverview: React.FC = () => {
  const navigate = useNavigate();

  // State toggle strictly for design review of Blueprint State A (Not Purchased) vs State B (Purchased)
  const [blueprintState, setBlueprintState] = useState<'not_purchased' | 'purchased'>('not_purchased');

  return (
    <div className="space-y-6">
      {/* 1. TOP 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. AI Visibility Score */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">AI Visibility Score</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-slate-900">
                {DESIGN_METRICS.visibilityScore}
              </span>
              <span className="font-mono text-xs text-slate-400 font-semibold">/100</span>
            </div>
            {/* Compact Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                style={{ width: `${DESIGN_METRICS.visibilityScore}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Current AI visibility
            </p>
          </div>
        </div>

        {/* 2. Score Band */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Score Band</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900">
                {DESIGN_METRICS.scoreBand}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                40–59
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Current visibility classification
            </p>
          </div>
        </div>

        {/* 3. Optimization Potential */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Optimization Potential</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-emerald-600">
                {DESIGN_METRICS.optimizationPotential}
              </span>
              <span className="font-mono text-xs text-slate-400 font-semibold">/100</span>
              <span className="text-[11px] font-bold text-emerald-700 ml-1">
                (+{DESIGN_METRICS.optimizationPotential - DESIGN_METRICS.visibilityScore} pts)
              </span>
            </div>
            {/* Compact Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${DESIGN_METRICS.optimizationPotential}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Potential after recommended improvements
            </p>
          </div>
        </div>

        {/* 4. Actions Completed */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Actions Completed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-slate-900">
                {DESIGN_METRICS.actionsCompleted}
              </span>
              <span className="font-mono text-xs text-slate-400 font-semibold">
                / {DESIGN_METRICS.totalActions}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${(DESIGN_METRICS.actionsCompleted / DESIGN_METRICS.totalActions) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Optimization recommendations completed
            </p>
          </div>
        </div>
      </div>

      {/* 2. AI VISIBILITY BREAKDOWN (4 PILLARS) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Visibility Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Diagnostic performance across the 4 core pillars of LLM search readiness
            </p>
          </div>
          <Link
            to="/dashboard/audit"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
          >
            <span>View Full Audit</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DESIGN_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const pct = (pillar.score / pillar.maxScore) * 100;

            return (
              <div
                key={pillar.key}
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {pillar.score} <span className="text-slate-400 font-normal">/ {pillar.maxScore}</span>
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900">{pillar.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Readiness</span>
                    <span className="font-mono text-slate-700">{Math.round(pct)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TWO-COLUMN LAYOUT: PRIORITY ISSUES & RECOMMENDED NEXT ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRIORITY ISSUES */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Priority Issues</h3>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {DESIGN_PRIORITY_ISSUES.length} Critical Findings
              </span>
            </div>

            <div className="space-y-3">
              {DESIGN_PRIORITY_ISSUES.map((issue) => (
                <div 
                  key={issue.id}
                  className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">
                      {issue.title}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wide shrink-0 ${issue.priorityColor}`}>
                      {issue.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {issue.description}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex justify-end">
                    <Link
                      to={issue.recommendationRoute}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                    >
                      <span>View Recommendation</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link
              to="/dashboard/recommendations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View all diagnostic findings →
            </Link>
          </div>
        </div>

        {/* RECOMMENDED NEXT ACTIONS */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Recommended Next Actions</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Checklist Preview
              </span>
            </div>

            <div className="space-y-2.5">
              {DESIGN_RECOMMENDED_ACTIONS.map((action) => (
                <div 
                  key={action.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-5 h-5 rounded-md border-2 border-slate-300 text-transparent flex items-center justify-center shrink-0">
                      {/* Checkbox indicator */}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {action.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {action.category}
                        </span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Est: {action.impact}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {action.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link
              to="/dashboard/recommendations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Open step-by-step checklist →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. BLUEPRINT SECTION (SUPPORTING BOTH STATE A & STATE B) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        {/* Design State Switcher for Review Purposes */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Blueprint Status
            </span>
          </div>

          {/* Interactive State Toggle (Design Review Tool) */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setBlueprintState('not_purchased')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                blueprintState === 'not_purchased'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              State A: Not Purchased
            </button>
            <button
              type="button"
              onClick={() => setBlueprintState('purchased')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                blueprintState === 'purchased'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              State B: Purchased
            </button>
          </div>
        </div>

        {/* STATE A — NOT PURCHASED */}
        {blueprintState === 'not_purchased' ? (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white border border-indigo-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100/80 text-indigo-800 border border-indigo-200/60 mb-2">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Actionable Framework
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                AI Visibility Blueprint™
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Get your personalized implementation plan based on your AI Visibility Audit. Includes step-by-step schema markup, authority citation directory, and LLM verification rubrics.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-98 text-center"
              >
                <span>Get My Blueprint — $297</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* STATE B — PURCHASED */
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/60 via-slate-50 to-white border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Purchased & Active
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                AI Visibility Blueprint™
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Your custom implementation framework, schema templates, and prompt testing rubrics have been generated and unlocked for your account.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <Link
                to="/dashboard/blueprint"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition-colors shadow-2xs"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>View Blueprint</span>
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Blueprint</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. SERVICES CARDS: DFY OPTIMIZATION & MONITORING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DFY OPTIMIZATION */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Turnkey Implementation
              </span>
              <span className="font-mono text-base font-black text-slate-900">
                $999
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-2">
              Done-For-You Optimization
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Have Promptila implement your highest-priority AI visibility improvements. Our engineers deploy custom schema, build citation authority, and verify LLM search recommendations.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/dashboard/dfy"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <span>Get Done-For-You Optimization</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* MONTHLY MONITORING */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Continuous Surveillance
              </span>
              <span className="font-mono text-base font-black text-slate-900">
                $99<span className="text-xs text-slate-400 font-normal">/month</span>
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-2">
              Monthly Monitoring
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Track changes in your AI visibility over time. Weekly benchmark sweeps identify competitive displacement and score progression as models refresh.
            </p>

            {/* Design Future Content Preview */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Latest Score</span>
                <span className="font-mono text-xs font-bold text-slate-900 block mt-0.5">42/100</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Previous</span>
                <span className="font-mono text-xs font-bold text-slate-500 block mt-0.5">38/100</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Change</span>
                <span className="font-mono text-xs font-bold text-emerald-600 block mt-0.5">+4 pts</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Report Date</span>
                <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">Oct 1, 2026</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/dashboard/monitoring"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <span>Start Monitoring</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6. RECENT ACTIVITY (COMPACT) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of audits, reports, and optimization milestones
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            UI Preview
          </span>
        </div>

        <div className="space-y-3">
          {DESIGN_RECENT_ACTIVITY.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/80 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${item.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerOverview;
