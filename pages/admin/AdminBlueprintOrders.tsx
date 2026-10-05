import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  CheckCircle2, 
  DollarSign, 
  Send, 
  Search, 
  X, 
  ExternalLink, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import MetricCard from '../../components/admin/MetricCard.tsx';
import DataTable from '../../components/admin/DataTable.tsx';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import EmptyState from '../../components/admin/EmptyState.tsx';
import { 
  BlueprintOrderItem, 
  BlueprintOrdersMetrics, 
  fetchAdminBlueprintOrders, 
  formatOrderRelativeTime, 
  formatOrderCalendarDate 
} from '../../lib/adminBlueprintOrdersService.ts';
import { 
  formatDeliveryStatus, 
  formatPaymentStatusLabel 
} from '../../lib/adminRecentOrdersService.ts';

export const AdminBlueprintOrders: React.FC = () => {
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<BlueprintOrderItem[]>([]);
  const [metrics, setMetrics] = useState<BlueprintOrdersMetrics>({
    totalOrders: 0,
    liveOrdersCount: 0,
    testOrdersCount: 0,
    liveSalesCount: 0,
    liveGrossRevenueDollars: 0,
    liveGrossRevenueFormatted: '$0.00',
    deliveryFulfillmentRate: null,
    qualifyingLiveOrdersCount: 0,
    qualifyingDeliveredCount: 0,
  });

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [envFilter, setEnvFilter] = useState<'all' | 'live' | 'test'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'failed'>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'delivered' | 'pending' | 'failed_bounced'>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');

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
    fetchAdminBlueprintOrders()
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setOrders(res.orders);
          setMetrics(res.metrics);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Blueprint orders:', err);
        setError(err?.message || 'Unable to load Blueprint orders');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering & Sorting (performed client-side over the fetched dataset)
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 1. Search Query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter((item) => {
        return (
          item.id.toLowerCase().includes(q) ||
          (item.audit_id && item.audit_id.toLowerCase().includes(q)) ||
          (item.stripe_payment_intent_id && item.stripe_payment_intent_id.toLowerCase().includes(q)) ||
          (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
          (item.customer_email && item.customer_email.toLowerCase().includes(q)) ||
          (item.business_name && item.business_name.toLowerCase().includes(q)) ||
          (item.website && item.website.toLowerCase().includes(q)) ||
          (item.product && item.product.toLowerCase().includes(q))
        );
      });
    }

    // 2. Environment Filter
    if (envFilter === 'live') {
      result = result.filter((item) => item.livemode === true);
    } else if (envFilter === 'test') {
      result = result.filter((item) => item.livemode === false);
    }

    // 3. Payment Filter
    if (paymentFilter !== 'all') {
      result = result.filter((item) => {
        const ps = (item.payment_status || '').toLowerCase().trim();
        return ps === paymentFilter;
      });
    }

    // 4. Fulfillment Filter
    if (fulfillmentFilter === 'delivered') {
      result = result.filter((item) => (item.delivery_status || '').toLowerCase() === 'delivered');
    } else if (fulfillmentFilter === 'pending') {
      result = result.filter((item) => {
        const ds = (item.delivery_status || '').toLowerCase();
        return ds === 'pending' || !ds;
      });
    } else if (fulfillmentFilter === 'failed_bounced') {
      result = result.filter((item) => {
        const ds = (item.delivery_status || '').toLowerCase();
        const os = (item.status || '').toLowerCase();
        return ['failed', 'bounce', 'error'].includes(ds) || os === 'failed';
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOption === 'amount_high') {
        return b.amount_paid - a.amount_paid;
      }
      if (sortOption === 'amount_low') {
        return a.amount_paid - b.amount_paid;
      }
      return 0;
    });

    return result;
  }, [orders, debouncedSearch, envFilter, paymentFilter, fulfillmentFilter, sortOption]);

  // Paginated Slice
  const totalCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    envFilter !== 'all' ||
    paymentFilter !== 'all' ||
    fulfillmentFilter !== 'all' ||
    sortOption !== 'newest';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setEnvFilter('all');
    setPaymentFilter('all');
    setFulfillmentFilter('all');
    setSortOption('newest');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 1. Four Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          subtext={`${metrics.liveOrdersCount} live · ${metrics.testOrdersCount} test`}
          icon={<ShoppingBag className="w-4 h-4 text-slate-700" />}
          iconBg="bg-slate-100"
          loading={loading}
        />

        {/* Live Blueprint Sales */}
        <MetricCard
          title="Live Blueprint Sales"
          value={metrics.liveSalesCount}
          subtext="$297 Blueprint purchases"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={loading}
        />

        {/* Live Gross Revenue */}
        <MetricCard
          title="Live Gross Revenue"
          value={metrics.liveGrossRevenueFormatted}
          subtext={
            metrics.testOrdersCount > 0
              ? `Excludes ${metrics.testOrdersCount} test ${metrics.testOrdersCount === 1 ? 'transaction' : 'transactions'}`
              : 'Stripe production sales'
          }
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={loading}
        />

        {/* Delivery Fulfillment Rate */}
        <MetricCard
          title="Delivery Fulfillment Rate"
          value={metrics.deliveryFulfillmentRate !== null ? `${metrics.deliveryFulfillmentRate}%` : '—'}
          subtext={
            metrics.liveSalesCount > 0
              ? `${metrics.qualifyingDeliveredCount} of ${metrics.liveSalesCount} live orders delivered`
              : 'No live orders yet'
          }
          icon={<Send className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-50"
          loading={loading}
        />
      </div>

      {/* 2. Main Orders Directory Container */}
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
              placeholder="Search Blueprint orders by ID, audit ID, customer, business, or domain..."
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
            {/* Environment Filter */}
            <select
              value={envFilter}
              onChange={(e) => {
                setEnvFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Transactions</option>
              <option value="live">Live Only</option>
              <option value="test">Test Only</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="failed">Failed</option>
            </select>

            {/* Fulfillment Filter */}
            <select
              value={fulfillmentFilter}
              onChange={(e) => {
                setFulfillmentFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Fulfillment</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="failed_bounced">Failed / Bounced</option>
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
              <option value="newest">Newest Orders</option>
              <option value="oldest">Oldest Orders</option>
              <option value="amount_high">Highest Amount</option>
              <option value="amount_low">Lowest Amount</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh Blueprint orders"
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
              <span>Loading Blueprint orders from Supabase...</span>
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
            <p className="text-xs font-bold text-rose-900">Unable to load Blueprint orders</p>
            <p className="text-[11px] text-rose-600 mt-0.5 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-5 h-5 text-slate-400" />}
            title="No Blueprint orders yet"
            description="Blueprint purchases will appear here after checkout."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<SlidersHorizontal className="w-5 h-5 text-slate-400" />}
            title="No Blueprint orders match your filters"
            description="Try adjusting your search query, environment selector, or clear active filters."
            actionText="Clear Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div>
            <DataTable<BlueprintOrderItem>
              columns={[
                {
                  key: 'order_audit_id',
                  header: 'Order / Audit ID',
                  render: (item) => (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400">Order</span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {item.id ? `${item.id.slice(0, 8)}…` : '—'}
                        </span>
                      </div>
                      {item.audit_id ? (
                        <Link
                          to={`/admin/audits/${item.audit_id}`}
                          className="font-mono text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline block mt-0.5"
                        >
                          {item.audit_id}
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono block mt-0.5">—</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'customer_business',
                  header: 'Customer / Business',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {item.customer_name || (
                          <span className="text-slate-400 italic font-normal">No customer name</span>
                        )}
                      </p>
                      <p className="font-medium text-slate-700 text-xs mt-0.5">
                        {item.business_name || 'Unknown business'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px]">
                        {item.customer_email ? (
                          <a
                            href={`mailto:${item.customer_email}`}
                            className="text-slate-500 hover:text-indigo-600 hover:underline truncate max-w-[140px]"
                          >
                            {item.customer_email}
                          </a>
                        ) : (
                          <span className="text-slate-400">No email</span>
                        )}
                        {item.website && (
                          <>
                            <span className="text-slate-300">·</span>
                            <a
                              href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-slate-400 hover:text-indigo-600 hover:underline group"
                            >
                              <span className="truncate max-w-[120px]">{item.website}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'product',
                  header: 'Product',
                  render: (item) => (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">
                        {item.product || 'DIY Blueprint'}
                      </span>
                      {!item.livemode && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          TEST
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (item) => (
                    <span className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                      {item.amount_formatted}
                    </span>
                  ),
                },
                {
                  key: 'payment',
                  header: 'Payment',
                  align: 'center',
                  render: (item) => (
                    <StatusBadge
                      status={item.payment_status || 'pending'}
                      label={formatPaymentStatusLabel(item.payment_status)}
                    />
                  ),
                },
                {
                  key: 'fulfillment',
                  header: 'Fulfillment',
                  align: 'center',
                  render: (item) => {
                    const { status, label } = formatDeliveryStatus(item.delivery_status, item.status);
                    return (
                      <div className="flex flex-col items-center">
                        <StatusBadge status={status} label={label} />
                        {item.error_message && (
                          <div
                            className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 border border-rose-200/70 rounded px-1.5 py-0.5 mt-1 max-w-[150px] truncate"
                            title={item.error_message}
                          >
                            <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                            <span className="truncate">{item.error_message}</span>
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'purchase_date',
                  header: 'Purchase Date',
                  align: 'right',
                  render: (item) => (
                    <div className="text-right">
                      <p className="text-xs text-slate-700 font-medium">
                        {formatOrderRelativeTime(item.created_at)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatOrderCalendarDate(item.created_at)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (item) => {
                    if (!item.audit_id) {
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
                        onClick={() => navigate(`/admin/audits/${item.audit_id}`)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-700 transition-colors shadow-2xs"
                      >
                        View Audit
                      </button>
                    );
                  },
                },
              ]}
              data={paginatedOrders}
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
                  of <strong className="text-slate-800 font-semibold">{totalCount}</strong> orders
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

export default AdminBlueprintOrders;
