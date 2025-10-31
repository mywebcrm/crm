'use client';

import { useState } from 'react';
import PosTerminal from './pos-terminal';
import RecentSales from './recent-sales';
import { normalizeSale, type PosCocktail, type SaleRecord } from '@/types/sales';

type SalesWorkspaceProps = {
  cocktails: PosCocktail[];
  initialSales: SaleRecord[];
};

export default function SalesWorkspace({ cocktails, initialSales }: SalesWorkspaceProps) {
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  function handleSaleCreated(sale: SaleRecord) {
    setSales((prev) => {
      const next = [normalizeSale(sale), ...prev];
      const unique = next.filter(
        (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
      );
      return unique.slice(0, 20);
    });
    setError('');
  }

  async function refreshSales() {
    setRefreshing(true);
    setError('');

    try {
      const response = await fetch('/api/sales');
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        const message = (payload as Record<string, string | undefined>)?.error;
        throw new Error(message ?? 'Не удалось обновить список продаж');
      }

      const normalized = Array.isArray((payload as { sales?: unknown[] }).sales)
        ? ((payload as { sales: unknown[] }).sales.map((sale) => normalizeSale(sale)))
        : [];

      setSales(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить список продаж');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <PosTerminal cocktails={cocktails} onSaleCreated={handleSaleCreated} />
      </div>
      <RecentSales sales={sales} refreshing={refreshing} onRefresh={refreshSales} error={error} />
    </div>
  );
}
