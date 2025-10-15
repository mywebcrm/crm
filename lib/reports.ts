import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type ReportPreset = 'today' | '7d' | '30d' | 'all' | 'custom';

export type ResolvedReportRange = {
  from?: Date;
  to?: Date;
  preset: ReportPreset;
};

const PRESET_VALUES: ReportPreset[] = ['today', '7d', '30d', 'all'];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateInput(value?: string | null, mode: 'start' | 'end' = 'start') {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (mode === 'start') {
      parsed.setHours(0, 0, 0, 0);
    } else {
      parsed.setHours(23, 59, 59, 999);
    }
  }

  return parsed;
}

export function resolveReportRange(params: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
}): ResolvedReportRange {
  const candidatePreset = params.preset && PRESET_VALUES.includes(params.preset as ReportPreset)
    ? (params.preset as ReportPreset)
    : undefined;

  const fromDate = parseDateInput(params.from, 'start');
  const toDate = parseDateInput(params.to, 'end');

  if (fromDate || toDate) {
    return {
      from: fromDate ?? undefined,
      to: toDate ?? undefined,
      preset: 'custom'
    };
  }

  const now = new Date();

  switch (candidatePreset) {
    case 'today': {
      return { from: startOfDay(now), to: endOfDay(now), preset: 'today' };
    }
    case '7d': {
      const start = startOfDay(shiftDays(now, -6));
      return { from: start, to: endOfDay(now), preset: '7d' };
    }
    case '30d': {
      const start = startOfDay(shiftDays(now, -29));
      return { from: start, to: endOfDay(now), preset: '30d' };
    }
    case 'all':
      return { preset: 'all' };
    default: {
      const start = startOfDay(shiftDays(now, -29));
      return { from: start, to: endOfDay(now), preset: '30d' };
    }
  }
}

export async function getDashboardMetrics() {
  const [salesToday, totalSales, topCocktails, payments] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        created_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    prisma.sale.count(),
    prisma.saleItem.groupBy({
      by: ['cocktail_id'],
      _sum: { qty: true },
      _count: { cocktail_id: true },
      orderBy: {
        _sum: { qty: 'desc' }
      },
      take: 5
    }),
    prisma.sale.groupBy({
      by: ['paymentType'],
      _sum: { total: true },
      _count: { paymentType: true }
    })
  ]);

  const cocktails = await prisma.cocktail.findMany({
    where: { id: { in: topCocktails.map((item) => item.cocktail_id) } },
    select: { id: true, name: true }
  });

  const cocktailNameMap = new Map(cocktails.map((cocktail) => [cocktail.id, cocktail.name] as const));

  return {
    salesToday: salesToday._sum.total ?? 0,
    totalSales,
    topCocktails: topCocktails.map((item) => ({
      id: item.cocktail_id,
      name: cocktailNameMap.get(item.cocktail_id) ?? 'Unknown',
      qty: item._sum.qty ?? 0
    })),
    payments: payments.map((payment) => ({
      type: payment.paymentType,
      total: payment._sum.total ?? 0,
      count: payment._count.paymentType ?? 0
    }))
  };
}

export async function getInventorySnapshot() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' }
  });

  return ingredients.map((ingredient) => ({
    ...ingredient,
    status: ingredient.stock_qty <= ingredient.min_qty ? 'low' : 'ok'
  }));
}

type DailyBucket = { total: number; count: number };

function toDateKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

export async function getSalesReport(range: { from?: Date; to?: Date } = {}) {
  const where: Prisma.SaleWhereInput = {};
  const dateFilter: Prisma.DateTimeFilter = {};

  if (range.from) {
    dateFilter.gte = range.from;
  }
  if (range.to) {
    dateFilter.lte = range.to;
  }

  if (Object.keys(dateFilter).length > 0) {
    where.created_at = dateFilter;
  }

  const saleWhere = Object.keys(where).length > 0 ? where : undefined;

  const [sales, items] = await Promise.all([
    prisma.sale.findMany({
      where: saleWhere,
      include: {
        items: {
          include: { cocktail: true }
        },
        user: true
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: saleWhere
    })
  ]);

  const paymentSummary = await prisma.sale.groupBy({
    by: ['paymentType'],
    _sum: { total: true },
    _count: { paymentType: true },
    where: saleWhere
  });

  const totals = items._sum.total ?? 0;
  const averageCheck = sales.length > 0 ? totals / sales.length : 0;

  const dailyMap = sales.reduce((acc, sale) => {
    const key = toDateKey(sale.created_at);
    const bucket = acc.get(key) ?? { total: 0, count: 0 };
    bucket.total += sale.total;
    bucket.count += 1;
    acc.set(key, bucket);
    return acc;
  }, new Map<string, DailyBucket>());

  const dailyTotals: { date: string; total: number; count: number }[] = (() => {
    if (range.from && range.to) {
      const series: { date: string; total: number; count: number }[] = [];
      let cursor = startOfDay(range.from);
      const end = startOfDay(range.to);

      while (cursor.getTime() <= end.getTime()) {
        const key = toDateKey(cursor);
        const bucket = dailyMap.get(key);
        series.push({ date: key, total: bucket?.total ?? 0, count: bucket?.count ?? 0 });
        cursor = shiftDays(cursor, 1);
      }
      return series;
    }

    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({ date, total: bucket.total, count: bucket.count }));
  })();

  return {
    sales,
    total: totals,
    averageCheck,
    paymentSummary,
    dailyTotals
  };
}
