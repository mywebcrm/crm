import InventoryEditor from '@/components/inventory-editor';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const ingredients = await prisma.ingredient.findMany({
    include: {
      recipe: {
        include: {
          cocktail: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const serialized = ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    stock_qty: Number(ingredient.stock_qty),
    min_qty: Number(ingredient.min_qty),
    uses: ingredient.recipe.map((recipe) => ({
      cocktailName: recipe.cocktail.name,
      qty: Number(recipe.qty)
    }))
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Склад</h1>
        <p className="text-sm text-slate-400">Запасы ингредиентов и связь с коктейлями для автоматического списания.</p>
      </div>
      <InventoryEditor initialIngredients={serialized} />
    </div>
  );
}
