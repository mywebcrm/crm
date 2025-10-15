import { NextRequest, NextResponse } from 'next/server';
import { getSalesReport, resolveReportRange } from '@/lib/reports';

export const runtime = 'nodejs';

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = resolveReportRange({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to')
  });
  const report = await getSalesReport({ from: range.from, to: range.to });
  const format = searchParams.get('format');

  if (format === 'csv') {
    const header = ['Дата', 'Бармен', 'Позиции', 'Сумма', 'Тип оплаты'];
    const rows = report.sales.map((sale) => [
      new Date(sale.created_at).toISOString(),
      sale.user.username,
      sale.items.map((item) => `${item.cocktail.name} x${item.qty}`).join(' | '),
      sale.total.toFixed(2),
      sale.paymentType
    ]);
    const csv = toCsv([header, ...rows]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bar-crm-report.csv"'
      }
    });
  }

  return NextResponse.json({
    ...report,
    range: {
      preset: range.preset,
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null
    }
  });
}
