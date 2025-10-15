import clsx from 'clsx';

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2
});

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short'
});

type DailyPoint = {
  date: string;
  total: number;
  count: number;
};

export default function DailySalesChart({ data }: { data: DailyPoint[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">Пока нет продаж за выбранный период.</p>;
  }

  const paddingX = 24;
  const paddingY = 20;
  const height = 180;
  const width = Math.max(data.length - 1, 1) * 56 + paddingX * 2;

  const totals = data.map((point) => point.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const range = Math.max(max - min, 0.0001);

  const points = data.map((point, index) => {
    const x = paddingX + (data.length === 1 ? 0 : ((width - paddingX * 2) / (data.length - 1)) * index);
    const ratio = (point.total - min) / range;
    const y = height - paddingY - ratio * (height - paddingY * 2);
    return { ...point, x, y };
  });

  const linePath =
    points.length === 1
      ? `M ${paddingX.toFixed(2)} ${points[0].y.toFixed(2)} L ${(width - paddingX).toFixed(2)} ${points[0].y.toFixed(2)}`
      : points
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(' ');

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1]?.x.toFixed(2)} ${(height - paddingY).toFixed(2)} L ${points[0]?.x.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`
      : '';

  const yBaseline = height - paddingY;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/30">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="График выручки по дням"
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 0, 106, 0.35)" />
              <stop offset="100%" stopColor="rgba(255, 0, 106, 0)" />
            </linearGradient>
          </defs>
          <rect width={width} height={height} fill="url(#salesGradient)" opacity={areaPath ? 0.25 : 0} />
          <line x1="0" x2={width} y1={yBaseline} y2={yBaseline} stroke="rgba(148, 163, 184, 0.15)" strokeWidth={1} />
          {areaPath ? <path d={areaPath} fill="url(#salesGradient)" opacity={0.4} /> : null}
          <path d={linePath} fill="none" stroke="rgb(255, 0, 106)" strokeWidth={3} strokeLinecap="round" />
          {points.map((point) => (
            <g key={point.date}>
              <circle cx={point.x} cy={point.y} r={5} fill="rgb(255, 0, 106)" />
              <circle cx={point.x} cy={point.y} r={9} fill="rgba(255, 0, 106, 0.18)" />
            </g>
          ))}
        </svg>
      </div>
      <ul className="grid gap-3 text-sm text-slate-200 md:grid-cols-2 xl:grid-cols-3">
        {points.map((point) => (
          <li
            key={point.date}
            className={clsx(
              'flex flex-col rounded-2xl border border-white/5 bg-white/5 px-4 py-3 transition',
              'hover:border-bar-accent/40 hover:bg-bar-accent/5'
            )}
          >
            <span className="text-xs uppercase tracking-wide text-slate-400">{dayFormatter.format(new Date(`${point.date}T00:00:00Z`))}</span>
            <span className="text-base font-semibold text-white">{currencyFormatter.format(point.total)}</span>
            <span className="text-xs text-slate-500">Чеков: {point.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
