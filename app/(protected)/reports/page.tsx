import Link from 'next/link';
import DailySalesChart from '@/components/daily-sales-chart';
import ReportFilters from '@/components/report-filters';
import { getSalesReport, resolveReportRange, type ResolvedReportRange } from '@/lib/reports';

export const dynamic = 'force-dynamic';

type ReportsPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU');

function toDateInputValue(date?: Date) {
  if (!date) return undefined;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatRangeSummary(range: ResolvedReportRange) {
  const format = (date: Date) => dateFormatter.format(date);

  switch (range.preset) {
    case 'today':
      return 'Сегодня';
    case '7d':
      return 'Последние 7 дней';
    case '30d':
      return 'Последние 30 дней';
    case 'all':
      return 'Весь период';
    case 'custom': {
      if (range.from && range.to) {
        return `${format(range.from)} – ${format(range.to)}`;
      }
      if (range.from) {
        return `С ${format(range.from)}`;
      }
      if (range.to) {
        return `До ${format(range.to)}`;
      }
      return 'Пользовательский период';
    }
    default:
      return 'Последние 30 дней';
  }
}

function extractParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const presetParam = extractParam(searchParams?.preset);
  const fromParam = extractParam(searchParams?.from);
  const toParam = extractParam(searchParams?.to);

  const range = resolveReportRange({
    preset: presetParam,
    from: fromParam,
    to: toParam
  });

  const report = await getSalesReport({ from: range.from, to: range.to });
  const summary = formatRangeSummary(range);
  const filterFrom = toDateInputValue(range.from);
  const filterTo = toDateInputValue(range.to);

  const csvParams = new URLSearchParams({ format: 'csv' });
  if (range.preset === 'custom') {
    if (fromParam ?? range.from) {
      csvParams.set('from', fromParam ?? range.from?.toISOString() ?? '');
    }
    if (toParam ?? range.to) {
      csvParams.set('to', toParam ?? range.to?.toISOString() ?? '');
    }
    csvParams.delete('preset');
  } else {
    csvParams.set('preset', range.preset);
  }

  const csvHref = `/api/reports?${csvParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Отчёты</h1>
        <p className="text-sm text-slate-400">Сводная статистика и экспорт данных в CSV для бухгалтерии.</p>
      </div>

      <ReportFilters activePreset={range.preset} summary={summary} from={filterFrom} to={filterTo} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="card-surface">
          <p className="text-sm text-slate-400">Выручка за период</p>
          <p className="mt-1 text-2xl font-semibold text-white">₽ {report.total.toFixed(2)}</p>
        </div>
        <div className="card-surface">
          <p className="text-sm text-slate-400">Количество чеков</p>
          <p className="mt-1 text-2xl font-semibold text-white">{report.sales.length}</p>
        </div>
        <div className="card-surface">
          <p className="text-sm text-slate-400">Средний чек</p>
          <p className="mt-1 text-2xl font-semibold text-white">₽ {report.averageCheck.toFixed(2)}</p>
        </div>
        <Link
          href={csvHref}
          className="button-primary"
        >
          Экспорт CSV
        </Link>
      </div>

      <section className="card-surface space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Динамика выручки</h2>
          <p className="text-sm text-slate-400">График по дням помогает отследить тренды и пики продаж.</p>
        </div>
        <DailySalesChart data={report.dailyTotals} />
      </section>

      <section className="card-surface">
        <h2 className="text-lg font-semibold text-white">Структура оплат</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {report.paymentSummary.map((payment) => (
            <div key={payment.paymentType} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
              <p className="text-sm uppercase tracking-wide text-bar-accent">{payment.paymentType}</p>
              <p className="text-lg font-semibold text-white">₽ {payment._sum.total?.toFixed(2)}</p>
              <p>Чеков: {payment._count.paymentType}</p>
            </div>
          ))}
          {report.paymentSummary.length === 0 ? <p className="text-sm text-slate-500">Продажи пока не оформлялись.</p> : null}
        </div>
      </section>

      <section className="card-surface overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500">
            <tr className="border-b border-white/5">
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Бармен</th>
              <th className="px-4 py-3">Позиции</th>
              <th className="px-4 py-3">Сумма</th>
              <th className="px-4 py-3">Оплата</th>
            </tr>
          </thead>
          <tbody>
            {report.sales.map((sale) => (
              <tr key={sale.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-slate-200">{new Date(sale.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{sale.user.username}</td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {sale.items.map((item) => (
                      <li key={item.id}>
                        {item.cocktail.name} × {item.qty}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 font-semibold text-white">₽ {sale.total.toFixed(2)}</td>
                <td className="px-4 py-3 capitalize">{sale.paymentType}</td>
              </tr>
            ))}
            {report.sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Оформите первую продажу, чтобы увидеть статистику.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
