import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  X, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import MetricCard from '../../components/admin/MetricCard.tsx';
import DataTable from '../../components/admin/DataTable.tsx';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import EmptyState from '../../components/admin/EmptyState.tsx';
import { 
  EnrichedEmailFollowupItem, 
  EmailActivitySummaryMetrics, 
  fetchAdminEmailActivityDirectory, 
  formatEmailType, 
  formatEmailStatus, 
  formatEmailSentTime, 
  formatEmailCalendarDateTime 
} from '../../lib/adminEmailActivityService.ts';

export const AdminEmails: React.FC = () => {
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<EnrichedEmailFollowupItem[]>([]);
  const [metrics, setMetrics] = useState<EmailActivitySummaryMetrics>({
    totalLogged: 0,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 0,
  });

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [emailNumberFilter, setEmailNumberFilter] = useState<string>('all');
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'num_asc' | 'num_desc'>('newest');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminEmailActivityDirectory()
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setEmails(res.emails);
          setMetrics(res.metrics);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading email activity directory:', err);
        setError(err?.message || 'Unable to load email activity');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamically extract distinct email numbers from the real returned dataset
  const availableEmailNumbers = useMemo(() => {
    const numbers = new Set<number>();
    for (const item of emails) {
      if (typeof item.email_number === 'number') {
        numbers.add(item.email_number);
      }
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }, [emails]);

  // Dynamically extract distinct email types from the real returned dataset
  const availableEmailTypes = useMemo(() => {
    const types = new Set<string>();
    for (const item of emails) {
      if (item.email_type && item.email_type.trim()) {
        types.add(item.email_type.trim());
      }
    }
    return Array.from(types).sort();
  }, [emails]);

  // Filtering & Sorting (performed client-side over the fetched dataset)
  const filteredEmails = useMemo(() => {
    let result = [...emails];

    // 1. Search Query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter((item) => {
        return (
          item.audit_id.toLowerCase().includes(q) ||
          (item.recipient_email && item.recipient_email.toLowerCase().includes(q)) ||
          (item.email_type && item.email_type.toLowerCase().includes(q)) ||
          (item.business_name && item.business_name.toLowerCase().includes(q)) ||
          (item.contact_name && item.contact_name.toLowerCase().includes(q)) ||
          (item.website && item.website.toLowerCase().includes(q))
        );
      });
    }

    // 2. Email Number Filter (Dynamic)
    if (emailNumberFilter !== 'all') {
      const targetNum = Number(emailNumberFilter);
      result = result.filter((item) => item.email_number === targetNum);
    }

    // 3. Email Type Filter (Dynamic)
    if (emailTypeFilter !== 'all') {
      result = result.filter((item) => item.email_type === emailTypeFilter);
    }

    // 4. Status Filter
    if (statusFilter === 'sent') {
      result = result.filter((item) => (item.status || '').toLowerCase().trim() === 'sent');
    } else if (statusFilter === 'pending') {
      result = result.filter((item) => {
        const s = (item.status || '').toLowerCase().trim();
        return s === 'pending' || s === 'queued';
      });
    } else if (statusFilter === 'failed') {
      result = result.filter((item) => {
        const s = (item.status || '').toLowerCase().trim();
        return s === 'failed' || s === 'error';
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.sent_at || a.created_at).getTime();
      const timeB = new Date(b.sent_at || b.created_at).getTime();

      if (sortOption === 'newest') {
        return timeB - timeA;
      }
      if (sortOption === 'oldest') {
        return timeA - timeB;
      }
      if (sortOption === 'num_asc') {
        return a.email_number - b.email_number;
      }
      if (sortOption === 'num_desc') {
        return b.email_number - a.email_number;
      }
      return 0;
    });

    return result;
  }, [emails, debouncedSearch, emailNumberFilter, emailTypeFilter, statusFilter, sortOption]);

  // Paginated Slice
  const totalCount = filteredEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedEmails = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmails.slice(startIndex, startIndex + pageSize);
  }, [filteredEmails, currentPage, pageSize]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    emailNumberFilter !== 'all' ||
    emailTypeFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortOption !== 'newest';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setEmailNumberFilter('all');
    setEmailTypeFilter('all');
    setStatusFilter('all');
    setSortOption('newest');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 1. Four Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logged Emails */}
        <MetricCard
          title="Total Logged Emails"
          value={metrics.totalLogged}
          subtext="Recorded dispatch events"
          icon={<Mail className="w-4 h-4 text-slate-700" />}
          iconBg="bg-slate-100"
          loading={loading}
        />

        {/* Sent */}
        <MetricCard
          title="Sent"
          value={metrics.sentCount}
          subtext="Successfully dispatched"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={loading}
        />

        {/* Failed */}
        <MetricCard
          title="Failed"
          value={metrics.failedCount}
          subtext="Dispatch failures"
          icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
          iconBg="bg-rose-50"
          loading={loading}
        />

        {/* Pending / Queued */}
        <MetricCard
          title="Pending / Queued"
          value={metrics.pendingCount}
          subtext="Awaiting dispatch"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
          loading={loading}
        />
      </div>

      {/* 2. Main Email Activity Container */}
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
              placeholder="Search email activity by audit ID, recipient, business, or type..."
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
            {/* Email # Filter (Dynamic) */}
            <select
              value={emailNumberFilter}
              onChange={(e) => {
                setEmailNumberFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Email Numbers</option>
              {availableEmailNumbers.map((num) => (
                <option key={num} value={num}>
                  #{num}
                </option>
              ))}
            </select>

            {/* Email Type Filter (Dynamic) */}
            <select
              value={emailTypeFilter}
              onChange={(e) => {
                setEmailTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Email Types</option>
              {availableEmailTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEmailType(type)}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending / Queued</option>
              <option value="failed">Failed / Error</option>
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
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="num_asc">Email # Low to High</option>
              <option value="num_desc">Email # High to Low</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh email activity"
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
              <span>Loading email dispatch logs from Supabase...</span>
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
            <p className="text-xs font-bold text-rose-900">Unable to load email activity</p>
            <p className="text-[11px] text-rose-600 mt-0.5 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : emails.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-5 h-5 text-slate-400" />}
            title="No email activity yet"
            description="Promptila email dispatch activity will appear here as messages are sent."
          />
        ) : filteredEmails.length === 0 ? (
          <EmptyState
            icon={<SlidersHorizontal className="w-5 h-5 text-slate-400" />}
            title="No email activity matches your filters"
            description="Try adjusting your search query, sequence number filter, or clear active filters."
            actionText="Clear Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div>
            <DataTable<EnrichedEmailFollowupItem>
              columns={[
                {
                  key: 'audit_id',
                  header: 'Audit ID',
                  render: (item) => (
                    <Link
                      to={`/admin/audits/${item.audit_id}`}
                      className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {item.audit_id}
                    </Link>
                  ),
                },
                {
                  key: 'business_contact',
                  header: 'Business / Contact',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {item.business_name || 'Unknown Business'}
                      </p>
                      <p className="font-medium text-slate-600 text-xs mt-0.5">
                        {item.contact_name || (
                          <span className="text-slate-400 italic font-normal">No contact name</span>
                        )}
                      </p>
                      {item.website && (
                        <a
                          href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-indigo-600 hover:underline mt-0.5 group"
                        >
                          <span className="truncate max-w-[130px]">{item.website}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'recipient',
                  header: 'Recipient',
                  render: (item) => {
                    if (!item.recipient_email) {
                      return <span className="text-slate-400 italic text-xs">No recipient recorded</span>;
                    }
                    return (
                      <a
                        href={`mailto:${item.recipient_email}`}
                        className="text-xs font-medium text-slate-700 hover:text-indigo-600 hover:underline truncate max-w-[180px] block"
                      >
                        {item.recipient_email}
                      </a>
                    );
                  },
                },
                {
                  key: 'email_number',
                  header: 'Email #',
                  align: 'center',
                  render: (item) => (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      #{item.email_number}
                    </span>
                  ),
                },
                {
                  key: 'email_type',
                  header: 'Email Type',
                  render: (item) => (
                    <span className="text-xs font-medium text-slate-700">
                      {formatEmailType(item.email_type)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  render: (item) => {
                    const { status, label } = formatEmailStatus(item.status);
                    return <StatusBadge status={status} label={label} />;
                  },
                },
                {
                  key: 'sent_time',
                  header: 'Sent Time',
                  align: 'right',
                  render: (item) => (
                    <div className="text-right">
                      <p className="text-xs text-slate-700 font-medium">
                        {formatEmailSentTime(item.sent_at, item.created_at)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatEmailCalendarDateTime(item.sent_at || item.created_at)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (item) => (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/audits/${item.audit_id}`)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-700 transition-colors shadow-2xs"
                    >
                      View Audit
                    </button>
                  ),
                },
              ]}
              data={paginatedEmails}
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
                  of <strong className="text-slate-800 font-semibold">{totalCount}</strong> email logs
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

export default AdminEmails;
