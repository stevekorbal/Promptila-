import { getSupabaseClient } from './supabase.ts';

export type DateRangeOption = 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days' | 'Year to Date';

export interface DateRangeBounds {
  currentStart: Date;
  currentEnd: Date;
  prevStart: Date;
  prevEnd: Date;
  timeframeLabel: string;
  days: number;
}

export interface KpiCardData {
  value: string;
  change?: string;
  changeType: 'positive' | 'negative' | 'neutral';
  timeframe?: string;
  subtext?: string;
  error?: boolean;
}

export interface AdminKpisData {
  freeAudits: KpiCardData;
  blueprintSales: KpiCardData;
  dfySales: KpiCardData;
  revenue: KpiCardData;
  blueprintConversionRate: KpiCardData;
  dfyConversionRate: KpiCardData;
}

/**
 * Calculates start and end timestamps for the selected period and its preceding comparison period.
 */
export function getDateRangeBounds(dateRange: string, referenceDate: Date = new Date()): DateRangeBounds {
  const currentEnd = new Date(referenceDate);

  if (dateRange === 'Last 7 Days') {
    const days = 7;
    const currentStart = new Date(currentEnd.getTime() - days * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(currentStart);
    const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      timeframeLabel: 'vs. prev 7d',
      days,
    };
  }

  if (dateRange === 'Last 90 Days') {
    const days = 90;
    const currentStart = new Date(currentEnd.getTime() - days * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(currentStart);
    const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      timeframeLabel: 'vs. prev 90d',
      days,
    };
  }

  if (dateRange === 'Year to Date') {
    const currentYear = currentEnd.getFullYear();
    const currentStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const spanMs = Math.max(1, currentEnd.getTime() - currentStart.getTime());
    const prevEnd = new Date(currentStart);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    const days = Math.max(1, Math.round(spanMs / (24 * 60 * 60 * 1000)));
    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      timeframeLabel: 'vs. prev period',
      days,
    };
  }

  // Default: 'Last 30 Days'
  const days = 30;
  const currentStart = new Date(currentEnd.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(currentStart);
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    currentStart,
    currentEnd,
    prevStart,
    prevEnd,
    timeframeLabel: 'vs. prev 30d',
    days,
  };
}

/**
 * Calculates percentage trend comparison between current and previous period.
 * Avoids infinite percentages if previous is 0.
 */
export function calculateTrend(
  current: number,
  previous: number
): { change?: string; changeType: 'positive' | 'negative' | 'neutral' } {
  if (previous === 0) {
    if (current > 0) {
      return { change: 'New', changeType: 'positive' };
    }
    return { change: '—', changeType: 'neutral' };
  }

  const diff = current - previous;
  const pct = (diff / previous) * 100;

  if (Math.abs(pct) < 0.05) {
    return { change: '0.0%', changeType: 'neutral' };
  }

  const sign = pct > 0 ? '+' : '';
  return {
    change: `${sign}${pct.toFixed(1)}%`,
    changeType: pct > 0 ? 'positive' : 'negative',
  };
}

/**
 * Interprets amount_paid:
 * For Promptila, blueprint_orders.amount_paid represents Stripe minor currency units (cents).
 * USD revenue = SUM(amount_paid) / 100
 *
 * Examples:
 * 29700 = $297.00
 * 59400 = $594.00
 * 89100 = $891.00
 */
export function formatCurrencyUsd(amountRaw: number): { formatted: string; dollars: number } {
  const dollars = amountRaw / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
  return { formatted, dollars };
}

/**
 * Fetches real Supabase data for the six Primary KPI cards:
 * 1. Free Audits (audits table, audit_type = 'free')
 * 2. Blueprint Sales (blueprint_orders table, status = 'completed' AND payment_status = 'paid')
 * 3. DFY Sales (Not connected, '—')
 * 4. Revenue (Sum of amount_paid from blueprint_orders, formatted in USD)
 * 5. Blueprint Conversion Rate ((Blueprint Sales / Free Audits) * 100)
 * 6. DFY Conversion Rate (Not connected, '—')
 */
export async function fetchAdminKpis(dateRange: string): Promise<AdminKpisData> {
  const { currentStart, currentEnd, prevStart, prevEnd, timeframeLabel, days } = getDateRangeBounds(dateRange);

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client is not configured or unavailable.');
    return {
      freeAudits: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      blueprintSales: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      dfySales: { value: '—', subtext: 'Not connected', changeType: 'neutral' },
      revenue: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      blueprintConversionRate: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      dfyConversionRate: { value: '—', subtext: 'Not connected', changeType: 'neutral' },
    };
  }

  try {
    const [
      currentAuditsRes,
      prevAuditsRes,
      currentOrdersRes,
      prevOrdersRes
    ] = await Promise.all([
      // Current Period Free Audits
      supabase
        .from('audits')
        .select('id, created_at', { count: 'exact' })
        .eq('audit_type', 'free')
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString()),

      // Previous Period Free Audits
      supabase
        .from('audits')
        .select('id, created_at', { count: 'exact' })
        .eq('audit_type', 'free')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),

      // Current Period Blueprint Orders
      supabase
        .from('blueprint_orders')
        .select('id, amount_paid, created_at', { count: 'exact' })
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .eq('livemode', true)
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString()),

      // Previous Period Blueprint Orders
      supabase
        .from('blueprint_orders')
        .select('id, amount_paid, created_at', { count: 'exact' })
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .eq('livemode', true)
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
    ]);

    // Handle Audits Query Errors
    let auditsHasError = false;
    if (currentAuditsRes.error) {
      console.error('Supabase query error on current audits:', currentAuditsRes.error);
      auditsHasError = true;
    }
    if (prevAuditsRes.error) {
      console.error('Supabase query error on previous audits:', prevAuditsRes.error);
      auditsHasError = true;
    }

    // Handle Blueprint Orders Query Errors
    let ordersHasError = false;
    if (currentOrdersRes.error) {
      console.error('Supabase query error on current blueprint_orders:', currentOrdersRes.error);
      ordersHasError = true;
    }
    if (prevOrdersRes.error) {
      console.error('Supabase query error on previous blueprint_orders:', prevOrdersRes.error);
      ordersHasError = true;
    }

    // 1. FREE AUDITS
    let freeAuditsKpi: KpiCardData;
    const currentFreeAudits = currentAuditsRes.count ?? currentAuditsRes.data?.length ?? 0;
    const prevFreeAudits = prevAuditsRes.count ?? prevAuditsRes.data?.length ?? 0;

    if (auditsHasError) {
      freeAuditsKpi = {
        value: '—',
        subtext: 'Data unavailable',
        changeType: 'neutral',
        error: true,
      };
    } else {
      const trend = calculateTrend(currentFreeAudits, prevFreeAudits);
      const avgPerDay = (currentFreeAudits / days).toFixed(1);
      freeAuditsKpi = {
        value: currentFreeAudits.toLocaleString(),
        change: trend.change,
        changeType: trend.changeType,
        timeframe: timeframeLabel,
        subtext: currentFreeAudits === 0 ? '0 total' : `${avgPerDay}/day avg · ${currentFreeAudits} total`,
      };
    }

    // 2. BLUEPRINT SALES
    let blueprintSalesKpi: KpiCardData;
    const currentBlueprintSales = currentOrdersRes.count ?? currentOrdersRes.data?.length ?? 0;
    const prevBlueprintSales = prevOrdersRes.count ?? prevOrdersRes.data?.length ?? 0;

    if (ordersHasError) {
      blueprintSalesKpi = {
        value: '—',
        subtext: 'Data unavailable',
        changeType: 'neutral',
        error: true,
      };
    } else {
      const trend = calculateTrend(currentBlueprintSales, prevBlueprintSales);
      blueprintSalesKpi = {
        value: currentBlueprintSales.toLocaleString(),
        change: trend.change,
        changeType: trend.changeType,
        timeframe: timeframeLabel,
        subtext: `$297/ea · ${currentBlueprintSales} units`,
      };
    }

    // 3. DFY SALES (Not connected per instruction)
    const dfySalesKpi: KpiCardData = {
      value: '—',
      subtext: 'Not connected',
      changeType: 'neutral',
    };

    // 4. REVENUE (Verified Blueprint revenue only)
    let revenueKpi: KpiCardData;
    if (ordersHasError) {
      revenueKpi = {
        value: '—',
        subtext: 'Blueprint revenue',
        changeType: 'neutral',
        error: true,
      };
    } else {
      const rawCurrentSum = (currentOrdersRes.data || []).reduce(
        (sum, row) => sum + (Number(row.amount_paid) || 0),
        0
      );
      const rawPrevSum = (prevOrdersRes.data || []).reduce(
        (sum, row) => sum + (Number(row.amount_paid) || 0),
        0
      );

      const { formatted: currentRevFormatted, dollars: currentDollars } = formatCurrencyUsd(rawCurrentSum);
      const { dollars: prevDollars } = formatCurrencyUsd(rawPrevSum);
      const trend = calculateTrend(currentDollars, prevDollars);

      revenueKpi = {
        value: currentRevFormatted,
        change: trend.change,
        changeType: trend.changeType,
        timeframe: timeframeLabel,
        subtext: 'Blueprint revenue',
      };
    }

    // 5. BLUEPRINT CONVERSION RATE
    let blueprintConvKpi: KpiCardData;
    if (auditsHasError || ordersHasError) {
      blueprintConvKpi = {
        value: '—',
        subtext: 'Data unavailable',
        changeType: 'neutral',
        error: true,
      };
    } else {
      const currentRate = currentFreeAudits === 0 ? 0 : (currentBlueprintSales / currentFreeAudits) * 100;
      const prevRate = prevFreeAudits === 0 ? 0 : (prevBlueprintSales / prevFreeAudits) * 100;

      let trend: { change?: string; changeType: 'positive' | 'negative' | 'neutral' };
      if (prevFreeAudits === 0) {
        trend = { change: '—', changeType: 'neutral' };
      } else {
        const diff = currentRate - prevRate;
        if (Math.abs(diff) < 0.01) {
          trend = { change: '0.00%', changeType: 'neutral' };
        } else {
          const sign = diff > 0 ? '+' : '';
          trend = {
            change: `${sign}${diff.toFixed(2)}%`,
            changeType: diff > 0 ? 'positive' : 'negative',
          };
        }
      }

      blueprintConvKpi = {
        value: `${currentRate.toFixed(2)}%`,
        change: trend.change,
        changeType: trend.changeType,
        timeframe: timeframeLabel,
        subtext: `${currentBlueprintSales} / ${currentFreeAudits} audits`,
      };
    }

    // 6. DFY CONVERSION RATE (Not connected per instruction)
    const dfyConvKpi: KpiCardData = {
      value: '—',
      subtext: 'Not connected',
      changeType: 'neutral',
    };

    return {
      freeAudits: freeAuditsKpi,
      blueprintSales: blueprintSalesKpi,
      dfySales: dfySalesKpi,
      revenue: revenueKpi,
      blueprintConversionRate: blueprintConvKpi,
      dfyConversionRate: dfyConvKpi,
    };
  } catch (err: any) {
    console.error('Unexpected error fetching admin KPIs from Supabase:', err);
    return {
      freeAudits: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      blueprintSales: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      dfySales: { value: '—', subtext: 'Not connected', changeType: 'neutral' },
      revenue: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      blueprintConversionRate: { value: '—', subtext: 'Unavailable', changeType: 'neutral', error: true },
      dfyConversionRate: { value: '—', subtext: 'Not connected', changeType: 'neutral' },
    };
  }
}
