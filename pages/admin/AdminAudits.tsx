import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSearch, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  X, 
  ExternalLink, 
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MetricCard from '../../components/admin/MetricCard.tsx';
import DataTable from '../../components/admin/DataTable.tsx';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import EmptyState from '../../components/admin/EmptyState.tsx';
import { 
  resolveAuditScore, 
  formatAuditStatusLabel, 
  formatAuditTimeAgo 
} from '../../lib/adminRecentAuditsService.ts';
import {
  AuditRecordItem,
  AuditsSummaryMetrics,
  fetchAuditsSummaryMetrics,
  fetchPaginatedAudits
} from '../../lib/adminAuditsService.ts';

export const AdminAudits: React.FC = () => {
  const navigate = useNavigate();
  // Summary Metrics State
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AuditsSummaryMetrics>({
    totalAudits: 0,
    freeAudits: 0,
    averageVisibilityScore: null,
    needsAttention: 0,
    availableStatuses: [],
  });

  // Table Data State
  const [audits, setAudits] = useState<AuditRecordItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'all' | 'free' | 'other'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | '0-24' | '25-49' | '50-74' | '75-100'>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'score_high' | 'score_low'>('newest');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Summary Metrics
  const loadMetrics = useCallback(() => {
    setMetricsLoading(true);
    setMetricsError(null);
    fetchAuditsSummaryMetrics()
      .then((res) => {
        setMetrics(res.metrics);
        setMetricsError(res.error || null);
        setMetricsLoading(false);
      })
      .catch((err) => {
        console.error('Error in loadMetrics:', err);
        setMetricsError(err?.message || 'Failed to load audit metrics');
        setMetricsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Load Table Audits
  const loadAudits = useCallback(() => {
    setTableLoading(true);
    setTableError(null);

    fetchPaginatedAudits({
      searchQuery: debouncedSearch,
      auditTypeFilter,
      statusFilter,
      scoreFilter,
      sortOption,
      page,
      pageSize,
    })
      .then((res) => {
        setAudits(res.audits);
        setTotalCount(res.totalCount);
        setTableError(res.error || null);
        setTableLoading(false);
      })
      .catch((err) => {
        console.error('Error in loadAudits:', err);
        setTableError(err?.message || 'Unable to load audits');
        setTableLoading(false);
      });
  }, [debouncedSearch, auditTypeFilter, statusFilter, scoreFilter, sortOption, page, pageSize]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  // Handle filter changes (resets to page 1)
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAuditTypeFilter(e.target.value as any);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setScoreFilter(e.target.value as any);
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as any);
    setPage(1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setAuditTypeFilter('all');
    setStatusFilter('all');
    setScoreFilter('all');
    setSortOption('newest');
    setPage(1);
  };

  const isFiltering = useMemo(() => {
    return (
      debouncedSearch !== '' ||
      auditTypeFilter !== 'all' ||
      statusFilter !== 'all' ||
      scoreFilter !== 'all' ||
      sortOption !== 'newest'
    );
  }, [debouncedSearch, auditTypeFilter, statusFilter, scoreFilter, sortOption]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, page * pageSize);

  // Merged available status options
  const statusOptions = useMemo(() => {
    const known = ['free_audit_sent', 'completed', 'pending', 'in_progress'];
    const merged = Array.from(new Set([...known, ...metrics.availableStatuses]));
    return merged;
  }, [metrics.availableStatuses]);

  return (
    <div className="space-y-6">
      {/* 1. Four Operational Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Audits"
          value={metricsLoading ? '...' : metrics.totalAudits.toLocaleString()}
          subtext="All intake records"
          icon={<FileSearch className="w-4 h-4" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          loading={metricsLoading}
        />

        <MetricCard
          title="Free Audits"
          value={metricsLoading ? '...' : metrics.freeAudits.toLocaleString()}
          subtext={
            metrics.totalAudits > 0
              ? `${Math.round((metrics.freeAudits / metrics.totalAudits) * 100)}% of total intakes`
              : 'Initial tier requests'
          }
          icon={<Sparkles className="w-4 h-4" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          loading={metricsLoading}
        />

        <MetricCard
          title="Average Visibility Score"
          value={
            metricsLoading
              ? '...'
              : metrics.averageVisibilityScore !== null
              ? `${metrics.averageVisibilityScore}/100`
              : '—'
          }
          subtext="Across scored audits"
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          loading={metricsLoading}
        />

        <MetricCard
          title="Needs Attention"
          value={metricsLoading ? '...' : metrics.needsAttention.toLocaleString()}
          subtext="Missing contact/domain or pending"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBg={metrics.needsAttention > 0 ? 'bg-amber-50' : 'bg-slate-50'}
          iconColor={metrics.needsAttention > 0 ? 'text-amber-600' : 'text-slate-400'}
          loading={metricsLoading}
        />
      </div>

      {/* 2. Main Audits Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        {/* Card Header & Controls */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Audits Directory</h3>
              <p className="text-xs text-slate-500">
                AI search footprint intake, readiness scoring, and customer contact pipeline
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  loadMetrics();
                  loadAudits();
                }}
                disabled={tableLoading}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                title="Refresh audit records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {isFiltering && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-100">
            {/* Search Box */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search audits..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Audit Type Filter */}
            <div>
              <select
                value={auditTypeFilter}
                onChange={handleTypeChange}
                aria-label="Filter by audit type"
                className="w-full py-1.5 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="all">All Types</option>
                <option value="free">Free</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                aria-label="Filter by status"
                className="w-full py-1.5 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white capitalize"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {formatAuditStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            {/* Score Filter */}
            <div>
              <select
                value={scoreFilter}
                onChange={handleScoreChange}
                aria-label="Filter by visibility score range"
                className="w-full py-1.5 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="all">All Scores</option>
                <option value="0-24">0–24 (Low)</option>
                <option value="25-49">25–49 (Fair)</option>
                <option value="50-74">50–74 (Good)</option>
                <option value="75-100">75–100 (Optimal)</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div>
              <select
                value={sortOption}
                onChange={handleSortChange}
                aria-label="Sort audit records"
                className="w-full py-1.5 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="score_high">Highest Score</option>
                <option value="score_low">Lowest Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. DataTable / States */}
        {tableLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-500">Loading audit records...</span>
          </div>
        ) : tableError ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">Unable to load audits</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{tableError}</p>
            <button
              type="button"
              onClick={loadAudits}
              className="mt-4 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold text-xs hover:bg-indigo-700 transition-colors"
            >
              Retry Query
            </button>
          </div>
        ) : audits.length === 0 ? (
          isFiltering ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <SlidersHorizontal className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No audits match your filters</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try adjusting your search keywords, status filters, or score ranges.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg font-semibold text-xs transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <FileSearch className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No audits yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Completed and incoming Promptila client audit requests will appear here.
              </p>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <DataTable<AuditRecordItem>
              columns={[
                {
                  key: 'audit_id',
                  header: 'Audit ID',
                  render: (item) => (
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {item.audit_id || item.id}
                    </span>
                  ),
                },
                {
                  key: 'business',
                  header: 'Business',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">
                        {item.business_name?.trim() || 'Unknown Business'}
                      </p>
                      {item.website ? (
                        <a
                          href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 mt-0.5"
                        >
                          <span className="truncate max-w-[150px]">{item.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5">No website</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'contact',
                  header: 'Contact',
                  render: (item) => (
                    <div>
                      <p
                        className={`font-medium text-xs leading-tight ${
                          !item.contact_name ? 'text-slate-400 italic' : 'text-slate-800'
                        }`}
                      >
                        {item.contact_name?.trim() || 'No contact name'}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          !item.contact_email ? 'text-slate-400 italic' : 'text-slate-500'
                        }`}
                      >
                        {item.contact_email?.trim() || 'No contact email'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'category_location',
                  header: 'Category / Location',
                  render: (item) => (
                    <div>
                      <p className="text-xs text-slate-700 font-medium leading-tight">
                        {item.category?.trim() || 'Unspecified category'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.location?.trim() || 'No location'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'visibility_score',
                  header: 'AI Visibility',
                  align: 'center',
                  render: (item) => {
                    const score = resolveAuditScore(item);
                    if (score === null) {
                      return <span className="text-slate-400 font-mono text-xs">—</span>;
                    }
                    return (
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-bold text-xs tabular-nums text-slate-900">
                          {score}/100
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                          />
                        </div>
                        {item.score_band && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                            {item.score_band}
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'audit_type',
                  header: 'Type',
                  align: 'center',
                  render: (item) => (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 capitalize">
                      {item.audit_type?.trim() || 'Free'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  render: (item) => (
                    <StatusBadge
                      status={item.status || 'pending'}
                      label={formatAuditStatusLabel(item.status)}
                    />
                  ),
                },
                {
                  key: 'created_at',
                  header: 'Created',
                  align: 'right',
                  render: (item) => (
                    <span
                      className="text-slate-500 text-[11px] tabular-nums"
                      title={item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    >
                      {formatAuditTimeAgo(item.created_at)}
                    </span>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (item) => (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/audits/${item.audit_id || item.id}`)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-700 transition-colors"
                    >
                      View Audit
                    </button>
                  ),
                },
              ]}
              data={audits}
              keyExtractor={(item) => item.id}
            />
          </div>
        )}

        {/* 4. Real Pagination Controls */}
        {!tableLoading && !tableError && totalCount > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-800 font-semibold">{startItem}–{endItem}</strong> of{' '}
                <strong className="text-slate-800 font-semibold">{totalCount}</strong> audits
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  aria-label="Audits per page"
                  className="py-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1 font-semibold text-slate-700 text-xs tabular-nums">
                Page {page} of {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAudits;
