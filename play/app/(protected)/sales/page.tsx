import SalesWorkspace from '@/components/sales-workspace';
import type { PosCocktail, SaleRecord } from '@/types/sales';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  const [cocktails, recentSales] = await Promise.all([
    prisma.cocktail.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    }),
    prisma.sale.findMany({
      include: {
        items: {
          include: { cocktail: true }
        },
        user: true
      },
      orderBy: { created_at: 'desc' },
      take: 20
    })
  ]);

  const serializedCocktails: PosCocktail[] = cocktails.map((cocktail) => ({
    id: cocktail.id,
    name: cocktail.name,
    price: Number(cocktail.price),
    image: cocktail.image,
    category: cocktail.category
      ? {
          id: cocktail.category.id,
          name: cocktail.category.name,
          color: cocktail.category.color
        }
      : null
  }));

  const serializedSales: SaleRecord[] = recentSales.map((sale) => ({
    id: sale.id,
    created_at: sale.created_at.toISOString(),
    total: Number(sale.total),
    paymentType: sale.paymentType,
    user: sale.user ? { id: sale.user.id, username: sale.user.username } : null,
    items: sale.items.map((item) => ({
      id: item.id,
      qty: item.qty,
      price: Number(item.price),
      cocktail: { id: item.cocktail.id, name: item.cocktail.name }
    }))
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">POS-стойка</h1>
        <p className="text-sm text-slate-400">Выберите коктейль, количество и способ оплаты. Склад обновится автоматически.</p>
      </div>
      <SalesWorkspace cocktails={serializedCocktails} initialSales={serializedSales} />
    </div>
  );
}
