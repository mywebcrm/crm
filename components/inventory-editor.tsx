'use client';

import { useMemo, useState } from 'react';

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  stock_qty: number;
  min_qty: number;
  uses: { cocktailName: string; qty: number }[];
};

type IngredientDraft = Ingredient & {
  draftStock: number;
  draftMin: number;
};

export default function InventoryEditor({ initialIngredients }: { initialIngredients: Ingredient[] }) {
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initialIngredients.map((item) => ({
      ...item,
      draftStock: Number(item.stock_qty),
      draftMin: Number(item.min_qty)
    }))
  );
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sortedIngredients = useMemo(
    () =>
      [...ingredients].sort((a, b) => a.name.localeCompare(b.name, 'ru-RU', { sensitivity: 'base' })),
    [ingredients]
  );

  function getStatus(ingredient: IngredientDraft) {
    return ingredient.draftStock <= ingredient.draftMin ? 'low' : 'ok';
  }

  function handleDraftChange(id: number, field: 'draftStock' | 'draftMin', value: number) {
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  }

  function resetDraft(id: number) {
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              draftStock: Number(item.stock_qty),
              draftMin: Number(item.min_qty)
            }
          : item
      )
    );
  }

  async function saveIngredient(ingredient: IngredientDraft) {
    setLoadingId(ingredient.id);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ingredient.id,
          stock_qty: ingredient.draftStock,
          min_qty: ingredient.draftMin
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Не удалось обновить ингредиент');
      }

      const payload = await response.json();
      setIngredients((prev) =>
        prev.map((item) =>
          item.id === ingredient.id
            ? {
                ...item,
                stock_qty: Number(payload.ingredient.stock_qty),
                min_qty: Number(payload.ingredient.min_qty),
                draftStock: Number(payload.ingredient.stock_qty),
                draftMin: Number(payload.ingredient.min_qty)
              }
            : item
        )
      );
      setMessage(`Остаток «${ingredient.name}» обновлён`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить ингредиент');
    } finally {
      setLoadingId(null);
    }
  }

  function hasChanges(ingredient: IngredientDraft) {
    return (
      Number(ingredient.draftStock) !== Number(ingredient.stock_qty) ||
      Number(ingredient.draftMin) !== Number(ingredient.min_qty)
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-300">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">{error}</div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {sortedIngredients.map((ingredient) => {
          const status = getStatus(ingredient);
          const dirty = hasChanges(ingredient);
          return (
            <div
              key={ingredient.id}
              className={`card-surface border ${
                status === 'low' ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{ingredient.name}</h3>
                  <p className="text-sm text-slate-400">Идентификатор: #{ingredient.id}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${
                    status === 'low'
                      ? 'border-red-500/40 bg-red-500/10 text-red-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {status === 'low' ? 'Ниже минимума' : 'Запас в норме'}
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Остаток
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={ingredient.draftStock}
                      onChange={(event) =>
                        handleDraftChange(ingredient.id, 'draftStock', Number(event.target.value))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-right text-white focus:border-bar-accent focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">{ingredient.unit}</span>
                  </div>
                </label>
                <label className="text-sm text-slate-300">
                  Минимум
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={ingredient.draftMin}
                      onChange={(event) =>
                        handleDraftChange(ingredient.id, 'draftMin', Number(event.target.value))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-right text-white focus:border-bar-accent focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">{ingredient.unit}</span>
                  </div>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                  onClick={() => resetDraft(ingredient.id)}
                  disabled={!dirty || loadingId === ingredient.id}
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => saveIngredient(ingredient)}
                  disabled={!dirty || loadingId === ingredient.id}
                >
                  {loadingId === ingredient.id ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
              <div className="mt-4 text-sm text-slate-400">
                <p className="font-semibold text-slate-200">Используется в:</p>
                {ingredient.uses.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {ingredient.uses.map((use) => (
                      <li key={`${ingredient.id}-${use.cocktailName}`}>{use.cocktailName} — {use.qty} {ingredient.unit}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-slate-500">Пока не используется.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
