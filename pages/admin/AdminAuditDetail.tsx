import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  RefreshCw, 
  Building2, 
  User, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Layers, 
  Bot, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  FileQuestion,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import { 
  resolveAuditScore, 
  formatAuditStatusLabel 
} from '../../lib/adminRecentAuditsService.ts';
import { 
  DetailedAuditRecord, 
  fetchAuditByAuditId 
} from '../../lib/adminAuditsService.ts';

export const AdminAuditDetail: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>();
  const [audit, setAudit] = useState<DetailedAuditRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalData, setShowTechnicalData] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadAudit = useCallback(() => {
    if (!auditId) return;
    setLoading(true);
    setError(null);

    fetchAuditByAuditId(auditId)
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setAudit(res.audit);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error in loadAudit:', err);
        setError(err?.message || 'Unable to load audit');
        setLoading(false);
      });
  }, [auditId]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const handleCopyJson = (key: string, data: any) => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDateTime = (dateString?: string | null): string => {
    if (!dateString) return 'Not recorded';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatPillarLabel = (name?: string | null, idx?: number): string => {
    if (!name) return `Pillar ${(idx ?? 0) + 1}`;
    const normalized = String(name).toLowerCase().trim().replace(/[_-\s]+/g, ' ');
    if (normalized.includes('geo')) return 'Geographic Identity';
    if (normalized.includes('conv')) return 'Conversational Authority';
    if (normalized.includes('mach')) return 'Machine-Readable Signals';
    if (normalized.includes('ext')) return 'External Validation';
    return String(name).replace(/_/g, ' ');
  };

  // Inspect canonical_audit content safely
  const canonical = useMemo(() => {
    if (!audit?.canonical_audit) return null;
    if (typeof audit.canonical_audit === 'object') return audit.canonical_audit;
    try {
      return JSON.parse(audit.canonical_audit);
    } catch {
      return null;
    }
  }, [audit?.canonical_audit]);

  // Verified canonical sections
  const canonicalSummary = useMemo(() => {
    if (!canonical) return null;
    return (
      canonical.executive_summary ||
      canonical.summary ||
      canonical.overview ||
      canonical.description ||
      null
    );
  }, [canonical]);

  const canonicalPillars = useMemo(() => {
    if (!canonical) return null;
    const raw = canonical.pillar_scores || canonical.pillars || canonical.categories || canonical.scores;
    if (!raw || typeof raw !== 'object') return null;

    // Check if it's an array or object
    if (Array.isArray(raw)) {
      return raw;
    }

    // Convert key-value object to array
    return Object.entries(raw).map(([key, val]: [string, any]) => {
      if (typeof val === 'number') {
        return { name: key, score: val, max: 25 };
      }
      if (val && typeof val === 'object') {
        return {
          name: val.name || val.title || key,
          score: val.score ?? val.points ?? null,
          max: val.max ?? val.total ?? 25,
          notes: val.notes || val.description || val.summary || null,
        };
      }
      return { name: key, score: null, max: 25 };
    });
  }, [canonical]);

  const canonicalPlatforms = useMemo(() => {
    if (!canonical) return null;
    const raw =
      canonical.platforms ||
      canonical.platform_results ||
      canonical.ai_platforms ||
      canonical.ai_results ||
      canonical.queries;
    if (!raw || typeof raw !== 'object') return null;

    if (Array.isArray(raw)) {
      return raw;
    }

    return Object.entries(raw).map(([key, val]: [string, any]) => {
      if (typeof val === 'string') {
        return { platform: key, status: val };
      }
      if (val && typeof val === 'object') {
        return {
          platform: val.platform || val.name || key,
          status: val.status || val.result || null,
          visibility: val.visibility || val.cited || null,
          details: val.details || val.response || val.summary || null,
        };
      }
      return { platform: key };
    });
  }, [canonical]);

  const canonicalIssues = useMemo(() => {
    if (!canonical) return null;
    const raw =
      canonical.critical_issues ||
      canonical.issues ||
      canonical.findings ||
      canonical.weaknesses ||
      canonical.gaps;
    if (!raw) return null;
    return Array.isArray(raw) ? raw : [raw];
  }, [canonical]);

  const canonicalRecommendations = useMemo(() => {
    if (!canonical) return null;
    const raw =
      canonical.recommendations ||
      canonical.action_items ||
      canonical.optimizations ||
      canonical.next_steps;
    if (!raw) return null;
    return Array.isArray(raw) ? raw : [raw];
  }, [canonical]);

  const canonicalCompetitors = useMemo(() => {
    if (!canonical) return null;
    const raw =
      canonical.competitors ||
      canonical.competitor_analysis ||
      canonical.displacing_competitors;
    if (!raw) return null;
    return Array.isArray(raw) ? raw : [raw];
  }, [canonical]);

  const canonicalCitations = useMemo(() => {
    if (!canonical) return null;
    const raw =
      canonical.citations ||
      canonical.evidence ||
      canonical.sources ||
      canonical.references;
    if (!raw) return null;
    return Array.isArray(raw) ? raw : [raw];
  }, [canonical]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded mb-2" />
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded mb-4" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-12 shadow-xs">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Unable to load audit</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadAudit}
            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
          <Link
            to="/admin/audits"
            className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Back to Audits
          </Link>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!audit) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-12 shadow-xs">
        <FileQuestion className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Audit not found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested audit record <strong className="text-slate-800 font-semibold">{auditId}</strong> could not be found.
        </p>
        <div className="mt-5">
          <Link
            to="/admin/audits"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Audits</span>
          </Link>
        </div>
      </div>
    );
  }

  const score = resolveAuditScore(audit);

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb & Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/audits"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Audits</span>
        </Link>

        <div className="flex items-center gap-2">
          {audit.website && (
            <a
              href={audit.website.startsWith('http') ? audit.website : `https://${audit.website}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span>Open Business Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={loadAudit}
            title="Refresh this audit"
            className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-indigo-600 tracking-wide">
                {audit.audit_id || audit.id}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 capitalize">
                {audit.audit_type?.trim() || 'Free'}
              </span>
              <StatusBadge
                status={audit.status || 'pending'}
                label={formatAuditStatusLabel(audit.status)}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {audit.business_name?.trim() || 'Unknown Business'}
            </h1>

            {audit.website ? (
              <a
                href={audit.website.startsWith('http') ? audit.website : `https://${audit.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors mt-1 group"
              >
                <span>{audit.website}</span>
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 mt-1 block">No website recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Top Four Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>AI Visibility Score</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {score !== null ? `${score}/100` : '—'}
            </span>
            {score !== null && (
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            {audit.visibility_score !== null && audit.visibility_score !== undefined
              ? 'Stored visibility_score'
              : audit.overall_score !== null
              ? 'Stored overall_score fallback'
              : 'No score stored'}
          </div>
        </div>

        {/* Score Band Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Score Band</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
              {audit.score_band?.trim() || '—'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Stored rating classification
          </div>
        </div>

        {/* Optimization Potential Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Optimization Potential</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {audit.optimization_potential !== null && audit.optimization_potential !== undefined
                ? typeof audit.optimization_potential === 'number' && audit.optimization_potential > 0
                  ? `+${audit.optimization_potential} pts`
                  : String(audit.optimization_potential)
                : '—'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Promptila improvement ceiling
          </div>
        </div>

        {/* Operational Status Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Operational Status</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2">
            <StatusBadge
              status={audit.status || 'pending'}
              label={formatAuditStatusLabel(audit.status)}
            />
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Current pipeline milestone
          </div>
        </div>
      </div>

      {/* 4. Three Information Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Business Information */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Business Information</h3>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Business Name</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {audit.business_name?.trim() || 'Not recorded'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Website</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {audit.website ? (
                  <a
                    href={audit.website.startsWith('http') ? audit.website : `https://${audit.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{audit.website}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  'Not recorded'
                )}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Location</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {audit.location?.trim() || 'Not recorded'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Category</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {audit.category?.trim() || 'Not recorded'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Audit Type</dt>
              <dd className="font-semibold text-slate-800 mt-0.5 capitalize">
                {audit.audit_type?.trim() || 'Not recorded'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Contact Name</dt>
              <dd
                className={`font-semibold mt-0.5 ${
                  !audit.contact_name ? 'text-slate-400 italic' : 'text-slate-800'
                }`}
              >
                {audit.contact_name?.trim() || 'No contact name'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Contact Email</dt>
              <dd
                className={`font-semibold mt-0.5 ${
                  !audit.contact_email ? 'text-slate-400 italic' : 'text-slate-800'
                }`}
              >
                {audit.contact_email ? (
                  <a
                    href={`mailto:${audit.contact_email.trim()}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {audit.contact_email.trim()}
                  </a>
                ) : (
                  'No contact email'
                )}
              </dd>
            </div>

            {audit.source_message_id && (
              <div>
                <dt className="text-slate-400 font-medium text-[11px]">Source Message ID</dt>
                <dd className="font-mono text-slate-600 text-[11px] mt-0.5 truncate">
                  {audit.source_message_id}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Audit Timeline / Record Information */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Audit Timeline</h3>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Created At</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {formatDateTime(audit.created_at)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Completed At</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {formatDateTime(audit.completed_at)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Last Updated</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {formatDateTime(audit.updated_at)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 font-medium text-[11px]">Internal UUID</dt>
              <dd className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">
                {audit.id}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 5. Canonical Audit Content Sections */}
      {canonical ? (
        <div className="space-y-6">
          {/* Executive Summary */}
          {canonicalSummary && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Executive Summary</h3>
              </div>
              {typeof canonicalSummary === 'string' ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line">
                  {canonicalSummary}
                </div>
              ) : (
                <div className="text-xs text-slate-700 space-y-2">
                  {Object.entries(canonicalSummary).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-semibold text-slate-900 capitalize">{k.replace(/_/g, ' ')}: </span>
                      <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Promptila Pillar Scores */}
          {canonicalPillars && canonicalPillars.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">AI Optimization Pillar Scores</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Standard 4-Pillar Evaluation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {canonicalPillars.map((p: any, idx: number) => {
                  const pScore = typeof p.score === 'number' ? p.score : null;
                  const pMax = p.max || 25;
                  const pct = pScore !== null ? Math.round((pScore / pMax) * 100) : 0;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {formatPillarLabel(p.name, idx)}
                        </span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                            {pScore !== null ? pScore : '—'}
                          </span>
                          <span className="text-xs text-slate-400">/{pMax}</span>
                        </div>
                        {pScore !== null && (
                          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {p.notes && (
                        <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200/60 leading-snug">
                          {String(p.notes)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Platform Results */}
          {canonicalPlatforms && canonicalPlatforms.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">AI Platform Footprint Results</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {canonicalPlatforms.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/70 bg-white shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 capitalize">
                          {item.platform ? String(item.platform).replace(/_/g, ' ') : `Engine ${idx + 1}`}
                        </span>
                        {item.status && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                            {String(item.status)}
                          </span>
                        )}
                      </div>
                      {item.visibility !== undefined && item.visibility !== null && (
                        <div className="text-xs text-slate-600 font-medium">
                          Visibility:{' '}
                          <strong className="text-slate-800">
                            {typeof item.visibility === 'boolean'
                              ? item.visibility
                                ? 'Cited'
                                : 'Not Cited'
                              : String(item.visibility)}
                          </strong>
                        </div>
                      )}
                    </div>

                    {item.details && (
                      <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 leading-snug">
                        {typeof item.details === 'object'
                          ? JSON.stringify(item.details)
                          : String(item.details)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Issues / Findings */}
          {canonicalIssues && canonicalIssues.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Critical Issues & Findings</h3>
              </div>

              <div className="space-y-2.5">
                {canonicalIssues.map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-amber-200/70 bg-amber-50/40 text-xs text-slate-700 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      {typeof issue === 'string' ? (
                        <p>{issue}</p>
                      ) : (
                        <div>
                          {issue.title && <h4 className="font-bold text-slate-900 mb-0.5">{issue.title}</h4>}
                          {issue.description && <p className="text-slate-600">{issue.description}</p>}
                          {issue.impact && (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                              Impact: {issue.impact}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations / Opportunities */}
          {canonicalRecommendations && canonicalRecommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Actionable Recommendations</h3>
              </div>

              <div className="space-y-2.5">
                {canonicalRecommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-emerald-200/70 bg-emerald-50/30 text-xs text-slate-700 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      {typeof rec === 'string' ? (
                        <p>{rec}</p>
                      ) : (
                        <div>
                          {rec.title && <h4 className="font-bold text-slate-900 mb-0.5">{rec.title}</h4>}
                          {rec.description && <p className="text-slate-600">{rec.description}</p>}
                          {rec.expected_gain && (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                              Expected Gain: {rec.expected_gain}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitors & Citations if present */}
          {(canonicalCompetitors || canonicalCitations) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {canonicalCompetitors && (
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Displacing Competitors</h3>
                  <div className="space-y-2 text-xs text-slate-700">
                    {canonicalCompetitors.map((comp: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                        {typeof comp === 'string' ? (
                          comp
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{comp.name || comp.domain}</span>
                            {comp.notes && <p className="text-[11px] text-slate-500 mt-0.5">{comp.notes}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canonicalCitations && (
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Verified Citations & Evidence</h3>
                  <div className="space-y-2 text-xs text-slate-700">
                    {canonicalCitations.map((cit: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                        {typeof cit === 'string' ? (
                          cit
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{cit.source || cit.title}</span>
                            {cit.url && (
                              <a
                                href={cit.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-[11px] text-indigo-600 hover:underline truncate mt-0.5"
                              >
                                {cit.url}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-xs text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <FileText className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-800 text-sm">Detailed Dossier Synthesis Pending</p>
          <p className="text-slate-400 mt-1 max-w-md mx-auto">
            This intake record has not yet had an automated canonical_audit synthesis payload populated.
          </p>
        </div>
      )}

      {/* 6. Collapsible Technical Audit Data (Raw JSON) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalData((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Technical Audit Data (Raw Payload)</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Internal / Debugging
            </span>
          </div>
          <div className="text-slate-400">
            {showTechnicalData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTechnicalData && (
          <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/50">
            {/* canonical_audit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-slate-700">canonical_audit</span>
                <button
                  type="button"
                  onClick={() => handleCopyJson('canonical', audit.canonical_audit)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  {copiedKey === 'canonical' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'canonical' ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-80 scrollbar-thin">
                {audit.canonical_audit ? JSON.stringify(audit.canonical_audit, null, 2) : 'null'}
              </pre>
            </div>

            {/* audit_data */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-slate-700">audit_data</span>
                <button
                  type="button"
                  onClick={() => handleCopyJson('audit_data', audit.audit_data)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  {copiedKey === 'audit_data' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'audit_data' ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-80 scrollbar-thin">
                {audit.audit_data ? JSON.stringify(audit.audit_data, null, 2) : 'null'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditDetail;
