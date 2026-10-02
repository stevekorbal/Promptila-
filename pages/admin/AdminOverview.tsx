import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  FileSearch, 
  FileCode, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  Download, 
  Filter, 
  ArrowUpRight, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  RefreshCw,
  Send,
  MoreVertical,
  ChevronDown,
  Building2,
  Mail,
  User,
  Layers,
  ArrowRight
} from 'lucide-react';

import MetricCard from '../../components/admin/MetricCard.tsx';
import ChartCard from '../../components/admin/ChartCard.tsx';
import DataTable from '../../components/admin/DataTable.tsx';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import AlertCard, { AdminAlert } from '../../components/admin/AlertCard.tsx';
import { fetchAdminKpis, AdminKpisData } from '../../lib/adminKpiService.ts';
import { fetchRevenueChartData, RevenueChartData } from '../../lib/adminRevenueChartService.ts';
import { fetchAuditVolumeChartData, AuditVolumeChartData } from '../../lib/adminAuditVolumeService.ts';
import { fetchAdminAlerts } from '../../lib/adminAlertsService.ts';
import { 
  fetchRecentAudits, 
  RecentAuditItem, 
  resolveAuditScore, 
  formatAuditStatusLabel, 
  formatAuditTimeAgo 
} from '../../lib/adminRecentAuditsService.ts';
import { 
  fetchRecentOrders, 
  RecentOrderItem, 
  formatOrderAmount, 
  formatPaymentStatusLabel, 
  formatDeliveryStatus, 
  formatOrderDate 
} from '../../lib/adminRecentOrdersService.ts';
import { 
  fetchEmailActivity, 
  EmailFollowupItem, 
  formatEmailType, 
  formatEmailStatus, 
  formatEmailSentTime 
} from '../../lib/adminEmailActivityService.ts';

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisData, setKpisData] = useState<AdminKpisData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueChartData | null>(null);
  const [auditVolumeLoading, setAuditVolumeLoading] = useState(true);
  const [auditVolumeData, setAuditVolumeData] = useState<AuditVolumeChartData | null>(null);
  const [recentAuditsLoading, setRecentAuditsLoading] = useState(true);
  const [recentAuditsError, setRecentAuditsError] = useState<string | null>(null);
  const [recentAuditsData, setRecentAuditsData] = useState<RecentAuditItem[]>([]);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true);
  const [recentOrdersError, setRecentOrdersError] = useState<string | null>(null);
  const [recentOrdersData, setRecentOrdersData] = useState<RecentOrderItem[]>([]);
  const [emailActivityLoading, setEmailActivityLoading] = useState(true);
  const [emailActivityError, setEmailActivityError] = useState<string | null>(null);
  const [emailActivityData, setEmailActivityData] = useState<EmailFollowupItem[]>([]);
  const [activeRevenueTab, setActiveRevenueTab] = useState<'30d' | '90d' | '12m'>('30d');
  const [hoveredRevenuePoint, setHoveredRevenuePoint] = useState<number | null>(null);
  const [hoveredColumnIdx, setHoveredColumnIdx] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setRecentAuditsLoading(true);
    setRecentAuditsError(null);

    fetchRecentAudits(5)
      .then((res) => {
        if (!isCancelled) {
          setRecentAuditsData(res.audits);
          setRecentAuditsError(res.error || null);
          setRecentAuditsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching recent audits:', err);
        if (!isCancelled) {
          setRecentAuditsError(err?.message || 'Failed to load audits');
          setRecentAuditsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setRecentOrdersLoading(true);
    setRecentOrdersError(null);

    fetchRecentOrders(5)
      .then((res) => {
        if (!isCancelled) {
          setRecentOrdersData(res.orders);
          setRecentOrdersError(res.error || null);
          setRecentOrdersLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching recent orders:', err);
        if (!isCancelled) {
          setRecentOrdersError(err?.message || 'Failed to load orders');
          setRecentOrdersLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setEmailActivityLoading(true);
    setEmailActivityError(null);

    fetchEmailActivity(10)
      .then((res) => {
        if (!isCancelled) {
          setEmailActivityData(res.emails);
          setEmailActivityError(res.error || null);
          setEmailActivityLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching email activity:', err);
        if (!isCancelled) {
          setEmailActivityError(err?.message || 'Failed to load email activity');
          setEmailActivityLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setKpisLoading(true);
    setRevenueLoading(true);
    setAuditVolumeLoading(true);

    fetchAdminKpis(dateRange)
      .then((data) => {
        if (!isCancelled) {
          setKpisData(data);
          setKpisLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching admin KPIs:', err);
        if (!isCancelled) {
          setKpisLoading(false);
        }
      });

    fetchRevenueChartData(dateRange)
      .then((data) => {
        if (!isCancelled) {
          setRevenueData(data);
          setRevenueLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching revenue chart data:', err);
        if (!isCancelled) {
          setRevenueLoading(false);
        }
      });

    fetchAuditVolumeChartData(dateRange)
      .then((data) => {
        if (!isCancelled) {
          setAuditVolumeData(data);
          setAuditVolumeLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching audit volume chart data:', err);
        if (!isCancelled) {
          setAuditVolumeLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dateRange]);

  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [alertsState, setAlertsState] = useState<AdminAlert[]>([]);

  const loadAlerts = useCallback(() => {
    setAlertsLoading(true);
    setAlertsError(null);
    fetchAdminAlerts()
      .then((res) => {
        setAlertsState(res.alerts);
        setAlertsError(res.error || null);
        setAlertsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching admin alerts:', err);
        setAlertsError(err?.message || 'Failed to fetch alerts');
        setAlertsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleDismissAlert = (alertToDismiss: AdminAlert) => {
    setAlertsState((prev) => prev.filter((a) => a.id !== alertToDismiss.id));
  };

  // Orders & Revenue breakdown computed from live Blueprint orders
  const blueprintOrdersCount = revenueData
    ? revenueData.points.reduce((acc, p) => acc + p.orders, 0)
    : (parseInt(kpisData?.blueprintSales.value || '0', 10) || 0);
  const blueprintRevenueDollars = revenueData?.totalRevenue ?? 0;
  const blueprintRevenueFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(blueprintRevenueDollars);

  const totalConnectedOrders = blueprintOrdersCount;
  const totalGrossDollars = blueprintRevenueDollars;
  const totalGrossFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalGrossDollars);

  const aovDollars = totalConnectedOrders > 0 ? totalGrossDollars / totalConnectedOrders : 0;
  const aovFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(aovDollars);

  return (
    <div className="space-y-6">
      {/* Overview Top Header & Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Promptila Admin</span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
              Internal Ops
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Business performance and system activity at a glance.
          </p>
        </div>

        {/* Compact Date-range selector & quick action matching reference */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 py-1.5 pl-3 pr-8 rounded-lg shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="Year to Date">Year to Date</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => alert('Exporting admin summary CSV...')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 6 Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Free Audits */}
        <MetricCard
          title="Free Audits"
          value={kpisData?.freeAudits.value ?? '—'}
          change={kpisData?.freeAudits.change}
          changeType={kpisData?.freeAudits.changeType}
          timeframe={kpisData?.freeAudits.timeframe}
          subtext={kpisData?.freeAudits.subtext}
          icon={<FileSearch className="w-4 h-4" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          loading={kpisLoading}
        />

        {/* 2. Blueprint Sales */}
        <MetricCard
          title="Blueprint Sales"
          value={kpisData?.blueprintSales.value ?? '—'}
          change={kpisData?.blueprintSales.change}
          changeType={kpisData?.blueprintSales.changeType}
          timeframe={kpisData?.blueprintSales.timeframe}
          subtext={kpisData?.blueprintSales.subtext}
          icon={<FileCode className="w-4 h-4" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          loading={kpisLoading}
        />

        {/* 3. DFY Sales (Not connected yet) */}
        <MetricCard
          title="DFY Sales"
          value="—"
          subtext="Not connected"
          icon={<Sparkles className="w-4 h-4" />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          loading={kpisLoading}
        />

        {/* 4. Revenue (Verified Blueprint revenue only) */}
        <MetricCard
          title="Revenue"
          value={kpisData?.revenue.value ?? '—'}
          change={kpisData?.revenue.change}
          changeType={kpisData?.revenue.changeType}
          timeframe={kpisData?.revenue.timeframe}
          subtext="Blueprint revenue"
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          loading={kpisLoading}
        />

        {/* 5. Blueprint Conversion Rate */}
        <MetricCard
          title="Blueprint Conv. Rate"
          value={kpisData?.blueprintConversionRate.value ?? '—'}
          change={kpisData?.blueprintConversionRate.change}
          changeType={kpisData?.blueprintConversionRate.changeType}
          timeframe={kpisData?.blueprintConversionRate.timeframe}
          subtext={kpisData?.blueprintConversionRate.subtext}
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          loading={kpisLoading}
        />

        {/* 6. DFY Conversion Rate (Not connected yet) */}
        <MetricCard
          title="DFY Conv. Rate"
          value="—"
          subtext="Not connected"
          icon={<ArrowUpRight className="w-4 h-4" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          loading={kpisLoading}
        />
      </div>

      {/* Main Dashboard Area: 2x2 Grid matching reference screenshot style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* 1. Revenue Trajectory Line/Area Chart */}
        <ChartCard
          title="Revenue Trajectory"
          subtitle={`${revenueData?.subtitle || 'Loading...'} ▾`}
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          headerRight={
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-bold text-slate-900 tabular-nums">
                {revenueLoading ? '...' : (revenueData?.totalRevenueFormatted || '$0.00 USD')}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${
                revenueData?.trendChangeType === 'positive'
                  ? 'text-emerald-700 bg-emerald-50'
                  : revenueData?.trendChangeType === 'negative'
                  ? 'text-rose-700 bg-rose-50'
                  : 'text-slate-600 bg-slate-100'
              }`}>
                {revenueData?.trendChange || '—'}
              </span>
            </div>
          }
        >
          <div className="h-64 sm:h-72 w-full flex flex-col justify-between pt-2">
            {revenueLoading ? (
              <div className="w-full h-52 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 font-medium">Loading revenue trajectory...</span>
                </div>
              </div>
            ) : revenueData?.error ? (
              <div className="w-full h-52 flex items-center justify-center text-xs text-slate-400">
                Revenue data unavailable
              </div>
            ) : (
              /* SVG Interactive Line Chart */
              <div className="relative w-full h-52">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal reference grid lines */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="190" x2="600" y2="190" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Filled gradient area below line */}
                  {revenueData && revenueData.points.length > 0 && (
                    <polygon
                      points={`${revenueData.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} 600,190 0,190`}
                      fill="url(#revenueGradient)"
                    />
                  )}

                  {/* Line path */}
                  {revenueData && revenueData.points.length > 0 && (
                    <path
                      d={revenueData.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Plot points */}
                  {revenueData?.points.map((pt, idx) => (
                    <g key={idx} className="cursor-pointer">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredRevenuePoint === idx ? 6 : (revenueData.totalRevenue > 0 && pt.revenue > 0 ? 4 : 3)}
                        fill="#ffffff"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        onMouseEnter={() => setHoveredRevenuePoint(idx)}
                        onMouseLeave={() => setHoveredRevenuePoint(null)}
                        className="transition-all"
                      />
                      {hoveredRevenuePoint === idx && (
                        <g>
                          <rect
                            x={Math.max(10, Math.min(pt.x - 55, 480))}
                            y={Math.max(10, pt.y - 48)}
                            width="110"
                            height="38"
                            rx="6"
                            fill="#0f172a"
                            className="shadow-md"
                          />
                          <text
                            x={Math.max(10, Math.min(pt.x - 55, 480)) + 55}
                            y={Math.max(10, pt.y - 48) + 14}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="9"
                            fontFamily="sans-serif"
                          >
                            {pt.date} · {pt.orders} {pt.orders === 1 ? 'sale' : 'sales'}
                          </text>
                          <text
                            x={Math.max(10, Math.min(pt.x - 55, 480)) + 55}
                            y={Math.max(10, pt.y - 48) + 29}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontWeight="bold"
                            fontSize="11"
                            fontFamily="sans-serif"
                          >
                            {pt.val} USD
                          </text>
                        </g>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {/* Bottom X-axis labels */}
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium px-1 pt-2 border-t border-slate-100">
              {revenueData?.xAxisLabels && revenueData.xAxisLabels.length > 0 ? (
                revenueData.xAxisLabels.map((lbl, idx) => (
                  <span key={idx}>{lbl}</span>
                ))
              ) : (
                <span>No timeline data</span>
              )}
            </div>
          </div>
        </ChartCard>

        {/* 2. Audit Volume Column Chart (matching reference style) */}
        <ChartCard
          title="Free Audit Volume by Category"
          subtitle={`${auditVolumeData?.subtitle || 'Loading...'} ▾`}
          icon={<BarChart3 className="w-4 h-4" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          headerRight={
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-bold text-slate-900 tabular-nums">
                {auditVolumeLoading ? '...' : (auditVolumeData?.totalAuditsFormatted || '0 Audits')}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${
                auditVolumeData?.trendChangeType === 'positive'
                  ? 'text-blue-700 bg-blue-50'
                  : auditVolumeData?.trendChangeType === 'negative'
                  ? 'text-rose-700 bg-rose-50'
                  : 'text-slate-600 bg-slate-100'
              }`}>
                {auditVolumeData?.trendChange || '—'}
              </span>
            </div>
          }
        >
          <div className="h-64 sm:h-72 w-full flex flex-col justify-between pt-2">
            {auditVolumeLoading ? (
              <div className="w-full h-52 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 font-medium">Loading audit volume...</span>
                </div>
              </div>
            ) : auditVolumeData?.error ? (
              <div className="w-full h-52 flex items-center justify-center text-xs text-slate-400">
                Audit volume data unavailable
              </div>
            ) : auditVolumeData?.categories && auditVolumeData.categories.length > 0 ? (
              /* Columns container */
              <div className="flex-1 flex items-end justify-around gap-2 sm:gap-4 px-2 sm:px-6 pb-2">
                {auditVolumeData.categories.map((col, idx) => {
                  const heightPercent = auditVolumeData.maxCount > 0
                    ? Math.max(12, Math.round((col.count / auditVolumeData.maxCount) * 100))
                    : 0;
                  const isHovered = hoveredColumnIdx === idx;

                  return (
                    <div
                      key={col.category}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer max-w-[72px]"
                      onMouseEnter={() => setHoveredColumnIdx(idx)}
                      onMouseLeave={() => setHoveredColumnIdx(null)}
                    >
                      {/* Tooltip / value */}
                      <span className={`text-[11px] font-bold tabular-nums mb-1 transition-opacity ${isHovered ? 'text-slate-900 opacity-100' : 'text-slate-500 opacity-80'}`}>
                        {col.count}
                      </span>

                      {/* Column pill container with soft background like reference */}
                      <div className="w-full max-w-[48px] bg-slate-100/90 rounded-lg h-44 flex flex-col justify-end p-1 transition-all">
                        <div
                          className="w-full rounded-md transition-all duration-300"
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: col.color,
                            opacity: isHovered ? 1 : 0.85
                          }}
                        />
                      </div>

                      {/* Column label */}
                      <span 
                        title={col.category}
                        className="text-[11px] font-medium text-slate-500 mt-2 truncate max-w-[70px] text-center"
                      >
                        {col.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 h-44">
                <p className="text-xs font-semibold text-slate-700">No Free Audits in this period</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[260px]">
                  Audit volume by category will display dynamically once free audit dossiers are requested.
                </p>
              </div>
            )}

            {/* Sub-label footer */}
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium px-2 pt-2 border-t border-slate-100">
              <span>Intake Sources</span>
              <span>{auditVolumeData?.avgAuditsPerDay || 'Average 0.0 Audits/Day'}</span>
            </div>
          </div>
        </ChartCard>

        {/* 3. Conversion Funnel */}
        <ChartCard
          title="Conversion Funnel"
          subtitle="Intake → DIY ($297) → DFY ($999)"
          icon={<Layers className="w-4 h-4" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          headerRight={
            <span className="text-xs font-semibold text-slate-500">
              3-Stage Sequence
            </span>
          }
        >
          {kpisLoading ? (
            <div className="h-64 sm:h-72 w-full flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 font-medium">Loading funnel data...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* 1. Free Audits */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">1. Free Audits</span>
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      100%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {kpisData?.freeAudits.error ? '—' : (kpisData?.freeAudits.value ?? '0')}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 tabular-nums">(100%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: kpisData?.freeAudits.value && kpisData.freeAudits.value !== '0' && kpisData.freeAudits.value !== '—'
                        ? '100%'
                        : '0%'
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>Free AI search dossiers generated</span>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                    Next step →
                  </span>
                </div>
              </div>

              {/* 2. DIY Blueprint */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">2. DIY Blueprint</span>
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {kpisData?.blueprintConversionRate.error ? '—' : `${kpisData?.blueprintConversionRate.value ?? '0.00%'} Conversion`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {kpisData?.blueprintSales.error ? '—' : (kpisData?.blueprintSales.value ?? '0')}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 tabular-nums">
                      ({kpisData?.blueprintConversionRate.error ? '—' : (kpisData?.blueprintConversionRate.value ?? '0.00%')})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, parseFloat(kpisData?.blueprintConversionRate.value || '0') || 0))}%`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>$297 self-paced execution framework</span>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                    Next step →
                  </span>
                </div>
              </div>

              {/* 3. DFY Optimization */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">3. DFY Optimization</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      Not connected
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-400 tabular-nums">—</span>
                    <span className="text-xs text-slate-400 ml-1.5 tabular-nums">(Not connected)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: '0%' }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>$999 turnkey specialist implementation</span>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* 4. Orders Breakdown: Blueprint ($297) vs DFY ($999) */}
        <ChartCard
          title="Orders & Revenue Breakdown"
          subtitle="DIY Blueprint vs Turnkey DFY"
          icon={<PieChartIcon className="w-4 h-4" />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          headerRight={
            <div className="text-xs font-bold text-slate-900 tabular-nums">
              {revenueLoading || kpisLoading
                ? '...'
                : `${totalConnectedOrders} ${totalConnectedOrders === 1 ? 'Order Total' : 'Orders Total'}`}
            </div>
          }
        >
          {revenueLoading || kpisLoading ? (
            <div className="h-56 w-full flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 font-medium">Loading orders & revenue...</span>
              </div>
            </div>
          ) : revenueData?.error ? (
            <div className="h-56 w-full flex items-center justify-center text-xs text-slate-400">
              Orders & revenue data unavailable
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
              {/* Donut graphic styled cleanly */}
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle / empty donut state */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                  {/* Live Blueprint slice (100% of connected orders when orders exist) */}
                  {totalConnectedOrders > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#4f46e5"
                      strokeWidth="14"
                      strokeDasharray="238.76"
                      strokeDashoffset="0"
                      className="transition-all duration-700"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-semibold text-slate-400">Total Gross</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {totalGrossFormatted}
                  </span>
                </div>
              </div>

              {/* Product stats list */}
              <div className="flex-1 space-y-3 w-full">
                {/* DIY Blueprint ($297) */}
                <div className="p-2.5 rounded-xl border border-slate-100 bg-indigo-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">DIY Blueprint ($297)</p>
                      <p className="text-[11px] text-slate-500">
                        {totalConnectedOrders > 0
                          ? `${blueprintOrdersCount} ${blueprintOrdersCount === 1 ? 'order' : 'orders'} · 100% of sales volume`
                          : `${blueprintOrdersCount} orders · —`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 tabular-nums">
                      {blueprintRevenueFormatted}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {totalGrossDollars > 0 ? '100% revenue' : '—'}
                    </p>
                  </div>
                </div>

                {/* DFY Optimization ($999) */}
                <div className="p-2.5 rounded-xl border border-slate-100 bg-purple-50/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-300 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">DFY Optimization ($999)</p>
                      <p className="text-[11px] text-slate-400">Not connected</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 tabular-nums">—</p>
                    <p className="text-[10px] text-slate-400">Not connected</p>
                  </div>
                </div>

                {/* AOV */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Average Order Value (AOV)</span>
                  <span className="font-bold text-slate-900 tabular-nums">{aovFormatted}</span>
                </div>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* 5. Needs Attention (Crucial Alert Section with Count Badge) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Needs Attention</h3>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  alertsState.length > 0
                    ? 'text-rose-700 bg-rose-50 border border-rose-200'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                }`}>
                  {alertsLoading ? '...' : `${alertsState.length} Active`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Actionable system events, delivery retries, and customer fulfillment tasks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAlerts}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Alerts</span>
          </button>
        </div>

        {alertsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Checking operational workflows...</span>
          </div>
        ) : alertsError ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="font-semibold text-slate-700">Alerts data temporarily unavailable</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Could not retrieve system operational alerts.</p>
          </div>
        ) : alertsState.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertsState.slice(0, 4).map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={(a) => {
                  if (a.actionLabel === 'View Order') {
                    navigate('/admin/blueprint-orders');
                  } else if (a.actionLabel === 'View Audit') {
                    navigate('/admin/audits');
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="font-semibold text-slate-700">No issues need attention</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All monitored Promptila workflows are operating normally.</p>
          </div>
        )}
      </div>

      {/* 6. Recent Audits (Compact Table) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Audits</h3>
              <p className="text-xs text-slate-500">Latest AI Visibility audit intake and readiness scoring</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {recentAuditsLoading
              ? 'Loading entries...'
              : recentAuditsData.length >= 5
              ? 'Showing latest 5 entries'
              : recentAuditsData.length > 0
              ? `Showing latest ${recentAuditsData.length} ${recentAuditsData.length === 1 ? 'entry' : 'entries'}`
              : '0 entries'}
          </span>
        </div>

        {recentAuditsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Loading recent audits...</span>
          </div>
        ) : recentAuditsError ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">Recent audits unavailable</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Could not load operational audit activity.</p>
          </div>
        ) : recentAuditsData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <FileSearch className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No audits yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Completed and submitted Promptila audits will appear here.</p>
          </div>
        ) : (
          <DataTable<RecentAuditItem>
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
                key: 'business_domain',
                header: 'Business & Domain',
                render: (item) => (
                  <div>
                    <p className="font-bold text-slate-900">{item.business_name?.trim() || 'Unknown Business'}</p>
                    <p className="text-[11px] text-slate-400">{item.website?.trim() || 'No website'}</p>
                  </div>
                ),
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (item) => (
                  <div>
                    <p className="font-medium text-slate-800">{item.contact_name?.trim() || 'No contact name'}</p>
                    <p className="text-[11px] text-slate-400">{item.contact_email?.trim() || 'No contact email'}</p>
                  </div>
                ),
              },
              {
                key: 'score',
                header: 'AI Visibility Score',
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
                    </div>
                  );
                },
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
                  <span className="text-slate-400 text-[11px] tabular-nums">
                    {formatAuditTimeAgo(item.created_at)}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: () => (
                  <button
                    type="button"
                    disabled
                    title="Audit detail route pending implementation"
                    className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-400 cursor-not-allowed"
                  >
                    View Dossier
                  </button>
                ),
              },
            ]}
            data={recentAuditsData}
            keyExtractor={(item) => item.id}
            footer={
              <>
                <span>Operational activity · Latest free AI search audits</span>
                <button 
                  type="button" 
                  onClick={() => navigate('/admin/audits')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  View all audits →
                </button>
              </>
            }
          />
        )}
      </div>

      {/* 7. Recent Orders (Compact Table) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Orders</h3>
              <p className="text-xs text-slate-500">Stripe payment status and fulfillment pipeline</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {recentOrdersLoading
              ? 'Loading entries...'
              : recentOrdersData.length >= 5
              ? 'Showing latest 5 entries'
              : recentOrdersData.length > 0
              ? `Showing latest ${recentOrdersData.length} ${recentOrdersData.length === 1 ? 'entry' : 'entries'}`
              : '0 entries'}
          </span>
        </div>

        {recentOrdersLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Loading recent orders...</span>
          </div>
        ) : recentOrdersError ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">Recent orders unavailable</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Could not load operational order activity.</p>
          </div>
        ) : recentOrdersData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <DollarSign className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No orders yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Blueprint purchases will appear here.</p>
          </div>
        ) : (
          <DataTable<RecentOrderItem>
            columns={[
              {
                key: 'id',
                header: 'Order / Audit ID',
                render: (item) => (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Order</span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {item.id ? `${item.id.slice(0, 8)}…` : '—'}
                      </span>
                    </div>
                    {item.audit_id && (
                      <span className="block font-mono text-[10px] font-semibold text-indigo-600 mt-0.5">
                        {item.audit_id}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'business',
                header: 'Customer Business',
                render: (item) => (
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {item.business_name?.trim() || 'Unknown Business'}
                    </span>
                    {item.customer_email && (
                      <span className="text-[11px] text-slate-400 block">
                        {item.customer_email}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'product',
                header: 'Product',
                render: (item) => (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-indigo-700">
                      {item.product?.trim() || 'DIY Blueprint'}
                    </span>
                    {!item.livemode && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded uppercase tracking-wide">
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
                    {formatOrderAmount(item.amount_paid)}
                  </span>
                ),
              },
              {
                key: 'paymentStatus',
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
                key: 'orderStatus',
                header: 'Fulfillment',
                align: 'center',
                render: (item) => {
                  const { status, label } = formatDeliveryStatus(item.delivery_status, item.status);
                  return <StatusBadge status={status} label={label} />;
                },
              },
              {
                key: 'date',
                header: 'Date',
                align: 'right',
                render: (item) => (
                  <span className="text-slate-400 text-[11px] tabular-nums">
                    {formatOrderDate(item.created_at)}
                  </span>
                ),
              },
            ]}
            data={recentOrdersData}
            keyExtractor={(item) => item.id}
            footer={
              <>
                <span>Operational activity · Blueprint order transactions</span>
                <button 
                  type="button" 
                  onClick={() => navigate('/admin/blueprint-orders')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  View all orders →
                </button>
              </>
            }
          />
        )}
      </div>

      {/* 8. Email Activity (Compact Stream / Table) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Activity Stream</h3>
              <p className="text-xs text-slate-500">Automated sequence dispatches and send activity</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {emailActivityLoading
              ? 'Loading entries...'
              : emailActivityData.length >= 10
              ? 'Showing latest 10 entries'
              : emailActivityData.length > 0
              ? `Showing latest ${emailActivityData.length} ${emailActivityData.length === 1 ? 'entry' : 'entries'}`
              : '0 entries'}
          </span>
        </div>

        {emailActivityLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Loading email activity...</span>
          </div>
        ) : emailActivityError ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">Email activity unavailable</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Could not load operational email followups.</p>
          </div>
        ) : emailActivityData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Mail className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No email activity yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Promptila email activity will appear here as messages are sent.</p>
          </div>
        ) : (
          <DataTable<EmailFollowupItem>
            columns={[
              {
                key: 'audit_id',
                header: 'Audit ID',
                render: (item) => (
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {item.audit_id}
                  </span>
                ),
              },
              {
                key: 'recipient',
                header: 'Recipient',
                render: (item) => (
                  <span className="font-medium text-slate-900">
                    {item.recipient_email?.trim() || 'No recipient recorded'}
                  </span>
                ),
              },
              {
                key: 'email_number',
                header: 'Email #',
                align: 'center',
                render: (item) => (
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    #{item.email_number}
                  </span>
                ),
              },
              {
                key: 'email_type',
                header: 'Email Type',
                render: (item) => (
                  <span className="text-slate-700">{formatEmailType(item.email_type)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Delivery Status',
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
                  <span className="text-slate-400 text-[11px] tabular-nums">
                    {formatEmailSentTime(item.sent_at, item.created_at)}
                  </span>
                ),
              },
            ]}
            data={emailActivityData}
            keyExtractor={(item) => item.id}
            footer={
              <>
                <span>Operational activity · Automated sequence logs</span>
                <button 
                  type="button" 
                  onClick={() => navigate('/admin/emails')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  View full email log →
                </button>
              </>
            }
          />
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
