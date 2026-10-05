import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Info, 
  Search, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import MetricCard from '../../components/admin/MetricCard.tsx';
import { AlertCard, AdminAlert } from '../../components/admin/AlertCard.tsx';
import EmptyState from '../../components/admin/EmptyState.tsx';
import { fetchAdminAlerts } from '../../lib/adminAlertsService.ts';

// Helper to format category for filter options & labels
export function formatCategoryLabel(category: string): string {
  switch (category) {
    case 'customer_data':
      return 'Customer Data';
    case 'blueprint_generation':
      return 'Blueprint Generation';
    case 'email_delivery':
      return 'Blueprint Delivery';
    case 'order_fulfillment':
      return 'Order Fulfillment';
    case 'system_workflow':
      return 'System Workflow';
    default:
      return category
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export const AdminAlerts: React.FC = () => {
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'priority'>('priority');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Alerts from fetchAdminAlerts()
  const loadAlerts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminAlerts()
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setAlerts(res.alerts);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching admin alerts:', err);
        setError(err?.message || 'Unable to load system alerts');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Summary Metrics calculated directly from the fetched alerts
  const metrics = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const warning = alerts.filter((a) => a.severity === 'warning').length;
    const info = alerts.filter((a) => a.severity === 'info').length;

    return { total, critical, warning, info };
  }, [alerts]);

  // Available categories dynamically extracted from returned alerts
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const a of alerts) {
      if (a.category) {
        cats.add(a.category);
      }
    }
    return Array.from(cats).sort();
  }, [alerts]);

  // Filtering & Sorting
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // 1. Search Query (across title, description, and audit/order identifier)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter((a) => {
        return (
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.auditId && a.auditId.toLowerCase().includes(q))
        );
      });
    }

    // 2. Severity Filter
    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    // 3. Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortOption === 'priority') {
        const severityRank = (s: string) => {
          if (s === 'critical') return 1;
          if (s === 'warning') return 2;
          return 3;
        };
        const rankDiff = severityRank(a.severity) - severityRank(b.severity);
        if (rankDiff !== 0) return rankDiff;
      }
      return 0;
    });

    if (sortOption === 'oldest') {
      result.reverse();
    }

    return result;
  }, [alerts, debouncedSearch, severityFilter, categoryFilter, sortOption]);

  // Paginated Slice
  const totalCount = filteredAlerts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAlerts.slice(startIndex, startIndex + pageSize);
  }, [filteredAlerts, currentPage, pageSize]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    severityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    sortOption !== 'priority';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setSortOption('priority');
    setPage(1);
  };

  const handleAlertAction = (alert: AdminAlert) => {
    if (alert.actionLabel === 'View Order') {
      navigate('/admin/blueprint-orders');
    } else if (alert.actionLabel === 'View Audit') {
      if (alert.auditId) {
        navigate(`/admin/audits/${alert.auditId}`);
      } else {
        navigate('/admin/audits');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Four Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Alerts */}
        <MetricCard
          title="Active Alerts"
          value={metrics.total}
          subtext="Requiring attention"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
          loading={loading}
        />

        {/* Critical */}
        <MetricCard
          title="Critical"
          value={metrics.critical}
          subtext="Workflow failures"
          icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
          iconBg="bg-rose-50"
          loading={loading}
        />

        {/* Warnings */}
        <MetricCard
          title="Warnings"
          value={metrics.warning}
          subtext="Data & delivery notices"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
          loading={loading}
        />

        {/* Informational */}
        <MetricCard
          title="Informational"
          value={metrics.info}
          subtext="Operational notices"
          icon={<Info className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-50"
          loading={loading}
        />
      </div>

      {/* 2. Main Alert Directory Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        {/* Header & Architecture Explanation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Active Issues</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                metrics.total > 0
                  ? 'text-rose-700 bg-rose-50 border border-rose-200'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              }`}>
                {loading ? '...' : `${metrics.total} Active`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Alerts are generated from current Promptila operational data and automatically clear when the underlying issue is resolved.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAlerts}
            title="Refresh alerts"
            className="self-start sm:self-auto px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Alerts</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts by title, description, or identifier..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Informational</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryLabel(cat)}
                </option>
              ))}
            </select>

            {/* Sort Option */}
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="priority">Highest Priority</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Alert Cards Feed View */}
        {loading ? (
          <div className="py-12 px-4 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Checking operational workflows...</span>
            </div>
            <div className="mt-4 space-y-2 max-w-2xl mx-auto">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="py-8 px-4 text-center bg-rose-50/50 rounded-xl border border-rose-200">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-rose-900">Unable to load system alerts</p>
            <p className="text-[11px] text-rose-600 mt-0.5 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={loadAlerts}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Refresh Alerts
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-12 px-4 text-center bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">All systems operational</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              No issues currently need attention across Promptila workflows.
            </p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-5 h-5 text-slate-400" />}
            title="No alerts match your filters"
            description="Try adjusting your search query, severity filter, or clear active filters."
            actionText="Clear Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paginatedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAction={handleAlertAction}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalCount > pageSize && (
              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>
                    Showing{' '}
                    <strong className="text-slate-800 font-semibold">
                      {(currentPage - 1) * pageSize + 1}
                    </strong>{' '}
                    –{' '}
                    <strong className="text-slate-800 font-semibold">
                      {Math.min(currentPage * pageSize, totalCount)}
                    </strong>{' '}
                    of <strong className="text-slate-800 font-semibold">{totalCount}</strong> alerts
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAlerts;
