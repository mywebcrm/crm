'use client';

import type { SaleRecord } from '@/types/sales';

const paymentLabels: Record<string, string> = {
  card: 'Карта',
  cash: 'Наличные',
  deposit: 'Депозит',
  bonus: 'Бонусы'
};

type RecentSalesProps = {
  sales: SaleRecord[];
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  error?: string;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('ru-RU');
}

export default function RecentSales({ sales, refreshing, onRefresh, error }: RecentSalesProps) {
  return (
    <div className="card-surface h-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Последние чеки</h2>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 transition hover:border-bar-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? 'Обновляем…' : 'Обновить'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      ) : null}

      <div className="mt-4 space-y-4">
        {sales.map((sale) => (
          <div key={sale.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
              <span>{formatDate(sale.created_at)}</span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300">
                {paymentLabels[sale.paymentType] ?? sale.paymentType}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-base font-semibold text-white">Чек #{sale.id}</p>
              <p className="text-base font-semibold text-bar-accent">₽ {sale.total.toFixed(2)}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">Бармен: {sale.user?.username ?? '—'}</p>
            <ul className="mt-3 space-y-1 text-xs text-slate-300">
              {sale.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span>{item.cocktail.name}</span>
                  <span className="text-slate-400">× {item.qty}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500">Продажи пока не оформлялись.</p>
        ) : null}
      </div>
    </div>
  );
}
