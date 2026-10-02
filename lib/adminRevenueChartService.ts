import { getSupabaseClient } from './supabase.ts';
import { getDateRangeBounds, calculateTrend } from './adminKpiService.ts';

export interface RevenueChartPoint {
  label: string;
  revenue: number;
  orders: number;
  x: number;
  y: number;
  val: string;
  date: string;
}

export interface RevenueChartData {
  points: RevenueChartPoint[];
  totalRevenue: number;
  totalRevenueFormatted: string;
  subtitle: string;
  trendChange?: string;
  trendChangeType: 'positive' | 'negative' | 'neutral';
  xAxisLabels: string[];
  error?: string | null;
}

interface Bucket {
  label: string;
  start: Date;
  end: Date;
  revenue: number;
  orders: number;
}

/**
 * Formats a subtitle representing the date range bounds
 * e.g. "Sep 2 - Oct 2, 2026"
 */
function formatSubtitleDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

/**
 * Builds continuous time buckets for the selected date range.
 * - Last 7 Days: daily (7 buckets)
 * - Last 30 Days: daily (30 buckets)
 * - Last 90 Days: weekly (13 buckets)
 * - Year to Date: monthly (from Jan up to current month)
 */
function buildBuckets(dateRange: string, currentStart: Date, currentEnd: Date): Bucket[] {
  const buckets: Bucket[] = [];

  if (dateRange === 'Last 7 Days') {
    const days = 7;
    const stepMs = (currentEnd.getTime() - currentStart.getTime()) / days;
    for (let i = 0; i < days; i++) {
      const bStart = new Date(currentStart.getTime() + i * stepMs);
      const bEnd = new Date(currentStart.getTime() + (i + 1) * stepMs);
      const label = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets.push({ label, start: bStart, end: bEnd, revenue: 0, orders: 0 });
    }
    return buckets;
  }

  if (dateRange === 'Last 90 Days') {
    const numWeeks = 13;
    const stepMs = (currentEnd.getTime() - currentStart.getTime()) / numWeeks;
    for (let i = 0; i < numWeeks; i++) {
      const bStart = new Date(currentStart.getTime() + i * stepMs);
      const bEnd = new Date(currentStart.getTime() + (i + 1) * stepMs);
      const label = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets.push({ label, start: bStart, end: bEnd, revenue: 0, orders: 0 });
    }
    return buckets;
  }

  if (dateRange === 'Year to Date') {
    const startYear = currentStart.getFullYear();
    const startMonth = currentStart.getMonth(); // 0 (Jan)
    const endMonth = currentEnd.getMonth();
    for (let m = startMonth; m <= endMonth; m++) {
      const bStart = new Date(startYear, m, 1);
      const bEnd = m === endMonth ? currentEnd : new Date(startYear, m + 1, 1);
      const label = bStart.toLocaleDateString('en-US', { month: 'short' });
      buckets.push({ label, start: bStart, end: bEnd, revenue: 0, orders: 0 });
    }
    return buckets;
  }

  // Default: 'Last 30 Days'
  const days = 30;
  const stepMs = (currentEnd.getTime() - currentStart.getTime()) / days;
  for (let i = 0; i < days; i++) {
    const bStart = new Date(currentStart.getTime() + i * stepMs);
    const bEnd = new Date(currentStart.getTime() + (i + 1) * stepMs);
    const label = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets.push({ label, start: bStart, end: bEnd, revenue: 0, orders: 0 });
  }
  return buckets;
}

/**
 * Extracts 5 to 7 evenly spaced labels from the buckets for the X-axis
 */
function extractXAxisLabels(buckets: Bucket[], maxLabels = 7): string[] {
  if (buckets.length <= maxLabels) {
    return buckets.map((b) => b.label);
  }
  const step = (buckets.length - 1) / (maxLabels - 1);
  const result: string[] = [];
  for (let i = 0; i < maxLabels; i++) {
    const idx = Math.min(Math.round(i * step), buckets.length - 1);
    result.push(buckets[idx].label);
  }
  return result;
}

/**
 * Fetches real revenue data from public.blueprint_orders for the Revenue Trajectory chart.
 * Strictly requires:
 * - status = 'completed'
 * - payment_status = 'paid'
 * - livemode = true
 * - created_at within selected date range
 *
 * Revenue is SUM(amount_paid) / 100
 */
export async function fetchRevenueChartData(dateRange: string): Promise<RevenueChartData> {
  const { currentStart, currentEnd, prevStart, prevEnd } = getDateRangeBounds(dateRange);
  const subtitle = formatSubtitleDateRange(currentStart, currentEnd);

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client is not available for revenue chart.');
    return {
      points: [],
      totalRevenue: 0,
      totalRevenueFormatted: '—',
      subtitle,
      trendChange: undefined,
      trendChangeType: 'neutral',
      xAxisLabels: [],
      error: 'Supabase client unavailable',
    };
  }

  try {
    const [currentOrdersRes, prevOrdersRes] = await Promise.all([
      // Current Period Live Blueprint Orders
      supabase
        .from('blueprint_orders')
        .select('id, amount_paid, created_at')
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .eq('livemode', true)
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString())
        .order('created_at', { ascending: true }),

      // Previous Period Live Blueprint Orders (for trend comparison)
      supabase
        .from('blueprint_orders')
        .select('id, amount_paid')
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .eq('livemode', true)
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
    ]);

    if (currentOrdersRes.error) {
      console.error('Supabase query error on current blueprint_orders for revenue chart:', currentOrdersRes.error);
      return {
        points: [],
        totalRevenue: 0,
        totalRevenueFormatted: '—',
        subtitle,
        trendChange: undefined,
        trendChangeType: 'neutral',
        xAxisLabels: [],
        error: currentOrdersRes.error.message,
      };
    }

    if (prevOrdersRes.error) {
      console.warn('Supabase query note on previous blueprint_orders for revenue chart:', prevOrdersRes.error);
    }

    const currentOrders = currentOrdersRes.data || [];
    const prevOrders = prevOrdersRes.data || [];

    // Calculate total revenue: SUM(amount_paid) / 100
    const totalRevenueCents = currentOrders.reduce((sum, order) => sum + (Number(order.amount_paid) || 0), 0);
    const totalRevenue = totalRevenueCents / 100;

    const prevRevenueCents = prevOrders.reduce((sum, order) => sum + (Number(order.amount_paid) || 0), 0);
    const prevRevenue = prevRevenueCents / 100;

    // Calculate comparison trend
    const trend = calculateTrend(totalRevenue, prevRevenue);

    // Format total revenue (e.g. "$0.00 USD" or "$297.00 USD")
    const totalRevenueFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalRevenue) + ' USD';

    // Build time buckets
    const buckets = buildBuckets(dateRange, currentStart, currentEnd);

    // Populate buckets with orders
    for (const order of currentOrders) {
      const orderTime = new Date(order.created_at).getTime();
      const amountDollars = (Number(order.amount_paid) || 0) / 100;

      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i];
        const isLast = i === buckets.length - 1;
        const matches = isLast
          ? orderTime >= b.start.getTime() && orderTime <= b.end.getTime()
          : orderTime >= b.start.getTime() && orderTime < b.end.getTime();

        if (matches) {
          b.revenue += amountDollars;
          b.orders += 1;
          break;
        }
      }
    }

    // Determine max revenue for SVG Y-axis scaling
    const maxBucketRevenue = Math.max(...buckets.map((b) => b.revenue), 0);
    // Baseline is at y = 190. Max top plot height is at y = 40 (span of 150px)
    const chartHeight = 150;
    const baselineY = 190;
    const chartWidth = 600;

    const n = buckets.length;
    const points: RevenueChartPoint[] = buckets.map((b, i) => {
      const x = n > 1 ? (i / (n - 1)) * chartWidth : chartWidth / 2;
      const y = maxBucketRevenue > 0
        ? baselineY - (b.revenue / maxBucketRevenue) * chartHeight
        : baselineY;

      return {
        label: b.label,
        revenue: b.revenue,
        orders: b.orders,
        x,
        y,
        val: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(b.revenue),
        date: b.label,
      };
    });

    const xAxisLabels = extractXAxisLabels(buckets);

    return {
      points,
      totalRevenue,
      totalRevenueFormatted,
      subtitle,
      trendChange: trend.change,
      trendChangeType: trend.changeType,
      xAxisLabels,
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error fetching revenue chart data:', err);
    return {
      points: [],
      totalRevenue: 0,
      totalRevenueFormatted: '—',
      subtitle,
      trendChange: undefined,
      trendChangeType: 'neutral',
      xAxisLabels: [],
      error: err?.message || 'Unexpected error',
    };
  }
}
