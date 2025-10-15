'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { ReportPreset } from '@/lib/reports';

type ReportFiltersProps = {
  activePreset: ReportPreset;
  summary: string;
  from?: string;
  to?: string;
};

const presetOptions: { value: Exclude<ReportPreset, 'custom'>; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'all', label: 'Всё время' }
];

function createQueryString(
  base: URLSearchParams | ReadonlyURLSearchParams | null,
  updates: Record<string, string | null>
) {
  const params = new URLSearchParams(base ? base.toString() : undefined);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function ReportFilters({ activePreset, summary, from, to }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [customFrom, setCustomFrom] = useState(from ?? '');
  const [customTo, setCustomTo] = useState(to ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setCustomFrom(from ?? '');
  }, [from]);

  useEffect(() => {
    setCustomTo(to ?? '');
  }, [to]);

  const isCustomActive = activePreset === 'custom';

  const quickFilters = useMemo(
    () =>
      presetOptions.map((option) => ({
        ...option,
        active: option.value === activePreset
      })),
    [activePreset]
  );

  function navigateWithParams(query: string) {
    startTransition(() => {
      router.replace(`${pathname}${query}`);
      router.refresh();
    });
  }

  function handleSelectPreset(preset: Exclude<ReportPreset, 'custom'>) {
    setError('');
    const query = createQueryString(searchParams, {
      preset,
      from: null,
      to: null
    });
    navigateWithParams(query);
  }

  function handleApplyCustom() {
    if (customFrom && customTo) {
      const start = new Date(customFrom);
      const end = new Date(customTo);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setError('Укажите корректные даты.');
        return;
      }
      if (start > end) {
        setError('Дата начала не может быть позже даты окончания.');
        return;
      }
    }
    setError('');

    const query = createQueryString(searchParams, {
      preset: null,
      from: customFrom || null,
      to: customTo || null
    });
    navigateWithParams(query);
  }

  return (
    <div className="card-surface space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelectPreset(option.value)}
            disabled={isPending}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              option.active
                ? 'border-bar-accent bg-bar-accent/20 text-bar-accent'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-bar-accent/60 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className={`rounded-full border px-4 py-2 text-sm ${isCustomActive ? 'border-bar-accent text-bar-accent' : 'border-white/10 text-slate-400'}`}>
          Пользовательский
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))] md:items-end">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          От
          <input
            type="date"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-bar-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          До
          <input
            type="date"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-bar-accent focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleApplyCustom}
          disabled={isPending}
          className="button-primary"
        >
          {isPending ? 'Применяем…' : 'Применить период'}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className="text-sm text-slate-400">Текущий период: {summary}</p>
    </div>
  );
}
