import Link from 'next/link';
import { getDashboardMetrics, getInventorySnapshot } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const shortcuts = [
  {
    title: 'Продажи',
    description: 'Оформляйте чеки и списывайте ингредиенты в один клик.',
    href: '/sales'
  },
  {
    title: 'Склад',
    description: 'Следите за остатками и предупреждениями по минимуму.',
    href: '/inventory'
  },
  {
    title: 'Отчёты',
    description: 'Выручка, популярные коктейли и статистика оплат.',
    href: '/reports'
  },
  {
    title: 'Настройки',
    description: 'Пользователи, роли и резервные копии данных.',
    href: '/settings'
  }
];

export default async function HomePage() {
  const [metrics, inventory] = await Promise.all([getDashboardMetrics(), getInventorySnapshot()]);

  const lowStock = inventory.filter((item) => item.status === 'low');

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-3">
        <div className="card-surface">
          <p className="text-sm text-slate-400">Выручка сегодня</p>
          <p className="mt-2 text-3xl font-semibold">₽ {metrics.salesToday.toFixed(2)}</p>
        </div>
        <div className="card-surface">
          <p className="text-sm text-slate-400">Чеков за всё время</p>
          <p className="mt-2 text-3xl font-semibold">{metrics.totalSales}</p>
        </div>
        <div className="card-surface">
          <p className="text-sm text-slate-400">Низкий остаток</p>
          <p className="mt-2 text-3xl font-semibold">{lowStock.length}</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Быстрые действия</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <Link key={shortcut.href} href={shortcut.href} className="card-surface hover:shadow-neon transition">
              <p className="text-lg font-semibold text-white">{shortcut.title}</p>
              <p className="mt-2 text-sm text-slate-400">{shortcut.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface">
          <h3 className="text-lg font-semibold text-white">Топ коктейлей</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {metrics.topCocktails.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{item.name}</span>
                <span className="text-bar-accent">{item.qty}</span>
              </li>
            ))}
            {metrics.topCocktails.length === 0 ? (
              <li className="text-slate-500">Пока нет продаж — оформите первый чек.</li>
            ) : null}
          </ul>
        </div>
        <div className="card-surface">
          <h3 className="text-lg font-semibold text-white">Типы оплат</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {metrics.payments.map((payment) => (
              <li key={payment.type} className="flex items-center justify-between">
                <span className="capitalize">{payment.type}</span>
                <span>₽ {payment.total.toFixed(2)}</span>
              </li>
            ))}
            {metrics.payments.length === 0 ? (
              <li className="text-slate-500">Данные появятся после первых продаж.</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="card-surface">
        <h3 className="text-lg font-semibold text-white">Остатки ниже минимума</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lowStock.map((ingredient) => (
            <div key={ingredient.id} className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
              <p className="font-semibold text-white">{ingredient.name}</p>
              <p className="text-sm text-red-300">
                Остаток: {ingredient.stock_qty} {ingredient.unit} (мин. {ingredient.min_qty} {ingredient.unit})
              </p>
            </div>
          ))}
          {lowStock.length === 0 ? <p className="text-sm text-slate-500">Все ингредиенты в норме.</p> : null}
        </div>
      </section>
    </div>
  );
}
