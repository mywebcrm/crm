'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { normalizeSale, type PosCocktail, type SaleRecord } from '@/types/sales';

const paymentTypes = [
  { value: 'card', label: 'Карта' },
  { value: 'cash', label: 'Наличные' },
  { value: 'deposit', label: 'Депозит' },
  { value: 'bonus', label: 'Бонусы' }
] as const;

type PosTerminalProps = {
  cocktails: PosCocktail[];
  onSaleCreated?: (sale: SaleRecord) => void;
};

type OrderItem = {
  cocktail: PosCocktail;
  qty: number;
};

export default function PosTerminal({ cocktails, onSaleCreated }: PosTerminalProps) {
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [paymentType, setPaymentType] = useState<(typeof paymentTypes)[number]['value']>('card');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, PosCocktail[]>();
    cocktails.forEach((cocktail) => {
      const key = cocktail.category?.name ?? 'Без категории';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(cocktail);
    });
    return Array.from(map.entries());
  }, [cocktails]);

  const orderMap = useMemo(() => {
    return new Map(order.map((item) => [item.cocktail.id, item] as const));
  }, [order]);

  const total = useMemo(
    () => order.reduce((acc, item) => acc + item.cocktail.price * item.qty, 0),
    [order]
  );

  function addToOrder(cocktail: PosCocktail) {
    setOrder((prev) => {
      const existing = prev.find((item) => item.cocktail.id === cocktail.id);
      if (existing) {
        return prev.map((item) =>
          item.cocktail.id === cocktail.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { cocktail, qty: 1 }];
    });
    setMessage('');
    setError('');
  }

  function updateQuantity(cocktailId: number, qty: number) {
    setOrder((prev) =>
      prev
        .map((item) =>
          item.cocktail.id === cocktailId ? { ...item, qty: Math.max(1, Math.round(qty)) } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function increment(cocktailId: number) {
    const current = orderMap.get(cocktailId);
    updateQuantity(cocktailId, (current?.qty ?? 0) + 1);
  }

  function decrement(cocktailId: number) {
    const current = orderMap.get(cocktailId);
    if (!current) return;
    if (current.qty <= 1) {
      remove(cocktailId);
    } else {
      updateQuantity(cocktailId, current.qty - 1);
    }
  }

  function remove(cocktailId: number) {
    setOrder((prev) => prev.filter((item) => item.cocktail.id !== cocktailId));
  }

  function clearOrder() {
    setOrder([]);
  }

  async function handleConfirm() {
    if (order.length === 0) {
      setError('Добавьте в чек хотя бы один коктейль');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: order.map((item) => ({ cocktailId: item.cocktail.id, qty: item.qty })),
          paymentType
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        const errorMessage = (payload as Record<string, string | undefined>)?.error;
        throw new Error(errorMessage ?? 'Не удалось сохранить продажу');
      }

      if (payload && typeof payload === 'object' && 'sale' in payload && onSaleCreated) {
        onSaleCreated(normalizeSale((payload as { sale: unknown }).sale));
      }

      setMessage(`Чек на сумму ₽ ${total.toFixed(2)} оформлен`);
      setOrder([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить продажу');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-300">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {categories.map(([categoryName, items]) => (
            <div key={categoryName} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{categoryName}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((cocktail) => {
                  const inOrder = orderMap.get(cocktail.id);
                  return (
                    <button
                      key={cocktail.id}
                      onClick={() => addToOrder(cocktail)}
                      className={`relative flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left transition hover:border-bar-accent ${
                        inOrder ? 'border-bar-accent/80 shadow-neon' : ''
                      }`}
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10">
                        {cocktail.image ? (
                          <Image src={cocktail.image} alt={cocktail.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-bar-accent/20 text-bar-accent">
                            {cocktail.name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{cocktail.name}</p>
                        <p className="text-sm text-slate-400">₽ {cocktail.price.toFixed(2)}</p>
                      </div>
                      {inOrder ? (
                        <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-bar-accent bg-bar-accent/20 text-sm text-bar-accent">
                          {inOrder.qty}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="card-surface space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Текущий чек</h3>
            {order.length > 0 ? (
              <button
                type="button"
                onClick={clearOrder}
                className="text-sm text-slate-400 transition hover:text-red-300"
                disabled={loading}
              >
                Очистить
              </button>
            ) : null}
          </div>

          {order.length === 0 ? (
            <p className="text-sm text-slate-500">Выберите коктейли из списка слева, чтобы сформировать чек.</p>
          ) : (
            <div className="space-y-4">
              {order.map((item) => (
                <div
                  key={item.cocktail.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{item.cocktail.name}</p>
                    <p className="text-xs text-slate-400">
                      ₽ {item.cocktail.price.toFixed(2)} × {item.qty} = ₽ {(item.cocktail.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => decrement(item.cocktail.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-lg text-white transition hover:border-white/20"
                      disabled={loading}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(event) => updateQuantity(item.cocktail.id, Number(event.target.value))}
                      className="h-8 w-16 rounded-lg border border-white/10 bg-black/30 text-center text-white focus:border-bar-accent focus:outline-none"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => increment(item.cocktail.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-lg text-white transition hover:border-white/20"
                      disabled={loading}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.cocktail.id)}
                      className="ml-2 rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-400 transition hover:border-red-500/40 hover:text-red-300"
                      disabled={loading}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Итого</span>
                <span className="text-xl font-semibold text-white">₽ {total.toFixed(2)}</span>
              </div>

              <label className="text-sm text-slate-400">
                Способ оплаты
                <select
                  value={paymentType}
                  onChange={(event) =>
                    setPaymentType(event.target.value as (typeof paymentTypes)[number]['value'])
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-bar-accent focus:outline-none"
                  disabled={loading}
                >
                  {paymentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleConfirm}
                className="button-primary w-full"
                disabled={loading || order.length === 0}
              >
                {loading ? 'Оформляем…' : 'Оформить чек'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
