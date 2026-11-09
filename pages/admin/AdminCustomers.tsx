import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  Search, 
  X, 
  ExternalLink, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import MetricCard from '../../components/admin/MetricCard.tsx';
import DataTable from '../../components/admin/DataTable.tsx';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import EmptyState from '../../components/admin/EmptyState.tsx';
import { 
  CustomerContactItem, 
  CustomersSummaryMetrics, 
  fetchAdminCustomers, 
  formatCustomerTimeAgo 
} from '../../lib/adminCustomersService.ts';

export const AdminCustomers: React.FC = () => {
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CustomerContactItem[]>([]);
  const [metrics, setMetrics] = useState<CustomersSummaryMetrics>({
    totalContacts: 0,
    payingCustomers: 0,
    auditedLeads: 0,
    averageVisibilityScore: null,
  });

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'paying_customer' | 'audited_lead' | 'pending_lead' | 'other_lead'>('all');
  const [blueprintFilter, setBlueprintFilter] = useState<'all' | 'purchased' | 'not_purchased'>('all');
  const [sortOption, setSortOption] = useState<'recent_activity' | 'oldest' | 'score_high' | 'score_low' | 'name_asc'>('recent_activity');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminCustomers()
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setContacts(res.contacts);
          setMetrics(res.metrics);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading customers:', err);
        setError(err?.message || 'Unable to load customers');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering & Sorting (performed client-side over the read-time grouped dataset)
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // 1. Search Query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter((item) => {
        return (
          (item.contact_name && item.contact_name.toLowerCase().includes(q)) ||
          (item.contact_email && item.contact_email.toLowerCase().includes(q)) ||
          (item.business_name && item.business_name.toLowerCase().includes(q)) ||
          (item.website && item.website.toLowerCase().includes(q)) ||
          (item.location && item.location.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.latest_audit_id && item.latest_audit_id.toLowerCase().includes(q))
        );
      });
    }

    // 2. Stage Filter
    if (stageFilter !== 'all') {
      result = result.filter((item) => item.stage === stageFilter);
    }

    // 3. Blueprint Filter
    if (blueprintFilter === 'purchased') {
      result = result.filter((item) => item.blueprintPurchased);
    } else if (blueprintFilter === 'not_purchased') {
      result = result.filter((item) => !item.blueprintPurchased);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortOption === 'recent_activity') {
        return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
      }
      if (sortOption === 'oldest') {
        return new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime();
      }
      if (sortOption === 'score_high') {
        const scoreA = a.latest_audit_score ?? -1;
        const scoreB = b.latest_audit_score ?? -1;
        return scoreB - scoreA;
      }
      if (sortOption === 'score_low') {
        const scoreA = a.latest_audit_score ?? 999;
        const scoreB = b.latest_audit_score ?? 999;
        return scoreA - scoreB;
      }
      if (sortOption === 'name_asc') {
        const nameA = (a.contact_name || a.business_name || '').toLowerCase();
        const nameB = (b.contact_name || b.business_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [contacts, debouncedSearch, stageFilter, blueprintFilter, sortOption]);

  // Paginated Slice
  const totalCount = filteredContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredContacts.slice(startIndex, startIndex + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    stageFilter !== 'all' ||
    blueprintFilter !== 'all' ||
    sortOption !== 'recent_activity';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStageFilter('all');
    setBlueprintFilter('all');
    setSortOption('recent_activity');
    setPage(1);
  };

  const getStageStatusKey = (stage: string): string => {
    switch (stage) {
      case 'paying_customer':
        return 'paid';
      case 'audited_lead':
        return 'completed';
      case 'pending_lead':
        return 'pending';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Four Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Contacts"
          value={metrics.totalContacts}
          subtext="Unique leads and accounts"
          icon={<Users className="w-4 h-4 text-indigo-600" />}
          iconBg="bg-indigo-50"
          loading={loading}
        />

        <MetricCard
          title="Paying Customers"
          value={metrics.payingCustomers}
          subtext="Verified livemode=true purchases"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={loading}
        />

        <MetricCard
          title="Audited Leads"
          value={metrics.auditedLeads}
          subtext="Free audits completed or sent"
          icon={<Sparkles className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-50"
          loading={loading}
        />

        <MetricCard
          title="Average Visibility Score"
          value={metrics.averageVisibilityScore !== null ? `${metrics.averageVisibilityScore}/100` : '—'}
          subtext="Across latest scored dossiers"
          icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
          loading={loading}
        />
      </div>

      {/* 2. Main Directory Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name, email, business, website, or audit ID..."
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
            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Stages</option>
              <option value="paying_customer">Paying Customers</option>
              <option value="audited_lead">Audited Leads</option>
              <option value="pending_lead">Pending Leads</option>
              <option value="other_lead">Other Leads</option>
            </select>

            {/* Blueprint Filter */}
            <select
              value={blueprintFilter}
              onChange={(e) => {
                setBlueprintFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Blueprint Status</option>
              <option value="purchased">Purchased ($299)</option>
              <option value="not_purchased">Not Purchased</option>
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
              <option value="recent_activity">Most Recent Activity</option>
              <option value="oldest">Oldest First</option>
              <option value="score_high">Highest Visibility Score</option>
              <option value="score_low">Lowest Visibility Score</option>
              <option value="name_asc">Name A–Z</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh directory"
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

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

        {/* Directory Table View */}
        {loading ? (
          <div className="py-12 px-4 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading customer records from Supabase...</span>
            </div>
            <div className="mt-4 space-y-2 max-w-2xl mx-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="py-8 px-4 text-center bg-rose-50/50 rounded-xl border border-rose-200">
            <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-rose-900">Unable to load customers</p>
            <p className="text-[11px] text-rose-600 mt-0.5 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            title="No customers or leads yet"
            description="Promptila contacts will appear here as audits are submitted."
          />
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon={<SlidersHorizontal className="w-5 h-5 text-slate-400" />}
            title="No contacts match your filters"
            description="Try adjusting your search query, stage selector, or clear active filters."
            actionText="Clear Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div>
            <DataTable<CustomerContactItem>
              columns={[
                {
                  key: 'customer',
                  header: 'Customer / Lead',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {item.contact_name || <span className="text-slate-400 italic font-normal">No contact name</span>}
                      </p>
                      {item.contact_email ? (
                        <a
                          href={`mailto:${item.contact_email}`}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 hover:underline block mt-0.5"
                        >
                          {item.contact_email}
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 block mt-0.5">No contact email</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'business',
                  header: 'Business',
                  render: (item) => (
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">
                        {item.business_name || 'Unknown Business'}
                      </p>
                      {item.website ? (
                        <a
                          href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 hover:underline mt-0.5 group"
                        >
                          <span className="truncate max-w-[140px] sm:max-w-[180px]">{item.website}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 block mt-0.5">No website</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'location_category',
                  header: 'Location / Category',
                  render: (item) => (
                    <div>
                      <p className="font-medium text-slate-700 text-xs">
                        {item.category || 'Unspecified category'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.location || 'No location'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'stage',
                  header: 'Stage',
                  align: 'center',
                  render: (item) => (
                    <StatusBadge
                      status={getStageStatusKey(item.stage)}
                      label={item.stageLabel}
                    />
                  ),
                },
                {
                  key: 'blueprint',
                  header: 'Blueprint',
                  align: 'center',
                  render: (item) => {
                    if (!item.blueprintPurchased) {
                      return <span className="text-slate-400 font-medium text-xs">—</span>;
                    }
                    return (
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Purchased
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">
                          $299
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'latest_audit',
                  header: 'Latest Audit',
                  align: 'center',
                  render: (item) => {
                    if (!item.latest_audit_id) {
                      return <span className="text-slate-400 font-mono text-xs">—</span>;
                    }
                    const score = item.latest_audit_score;
                    return (
                      <div className="flex flex-col items-center">
                        <Link
                          to={`/admin/audits/${item.latest_audit_id}`}
                          className="font-mono font-bold text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {item.latest_audit_id}
                        </Link>
                        {score !== null ? (
                          <div className="flex flex-col items-center mt-1">
                            <span className="font-mono text-[11px] font-bold text-slate-800">
                              {score}/100
                            </span>
                            <div className="w-14 h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px] mt-0.5">—</span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'activity',
                  header: 'Activity',
                  align: 'right',
                  render: (item) => (
                    <div className="text-right">
                      <p className="text-xs text-slate-700 font-medium">
                        Active {formatCustomerTimeAgo(item.last_active_at)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        First seen {formatCustomerTimeAgo(item.first_seen_at)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (item) => {
                    if (!item.latest_audit_id) {
                      return (
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-400 cursor-not-allowed opacity-60"
                        >
                          View Audit
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/audits/${item.latest_audit_id}`)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-700 transition-colors shadow-2xs"
                      >
                        View Audit
                      </button>
                    );
                  },
                },
              ]}
              data={paginatedContacts}
              keyExtractor={(item) => item.id}
            />

            {/* Pagination & Count Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>
                  Showing{' '}
                  <strong className="text-slate-800 font-semibold">
                    {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  –{' '}
                  <strong className="text-slate-800 font-semibold">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </strong>{' '}
                  of <strong className="text-slate-800 font-semibold">{totalCount}</strong> contacts
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

              {totalPages > 1 && (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
