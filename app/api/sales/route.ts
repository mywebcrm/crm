import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const sales = await prisma.sale.findMany({
    include: {
      items: {
        include: { cocktail: true }
      },
      user: true
    },
    orderBy: { created_at: 'desc' },
    take: 20
  });

  return NextResponse.json({ sales });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { items, paymentType } = await request.json();

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Добавьте хотя бы один коктейль' }, { status: 400 });
  }

  const payment = typeof paymentType === 'string' ? paymentType : 'card';
  const ids = items.map((item: { cocktailId: number }) => item.cocktailId);

  const cocktails = await prisma.cocktail.findMany({
    where: { id: { in: ids } },
    include: {
      recipe: true
    }
  });

  if (cocktails.length !== ids.length) {
    return NextResponse.json({ error: 'Некоторые коктейли не найдены' }, { status: 404 });
  }

  const ingredientUsage = new Map<number, number>();
  let total = 0;

  for (const item of items) {
    const cocktail = cocktails.find((c) => c.id === item.cocktailId);
    const qty = Number(item.qty ?? 1);
    if (!cocktail || qty <= 0) continue;
    total += cocktail.price * qty;
    for (const recipe of cocktail.recipe) {
      ingredientUsage.set(recipe.ingredient_id, (ingredientUsage.get(recipe.ingredient_id) ?? 0) + recipe.qty * qty);
    }
  }

  const ingredientIds = Array.from(ingredientUsage.keys());
  const ingredients = await prisma.ingredient.findMany({ where: { id: { in: ingredientIds } } });

  for (const ingredient of ingredients) {
    const required = ingredientUsage.get(ingredient.id) ?? 0;
    if (ingredient.stock_qty - required < 0) {
      return NextResponse.json(
        {
          error: `Недостаточно ${ingredient.name}. Требуется ${required}${ingredient.unit}, остаток ${ingredient.stock_qty}${ingredient.unit}`
        },
        { status: 400 }
      );
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        user_id: user.id,
        paymentType: payment,
        total,
        items: {
          create: items
            .map((item: { cocktailId: number; qty: number }) => ({
              cocktail_id: item.cocktailId,
              qty: Number(item.qty ?? 1),
              price: cocktails.find((c) => c.id === item.cocktailId)?.price ?? 0
            }))
            .filter((entry) => entry.qty > 0)
        }
      },
      include: {
        items: {
          include: { cocktail: true }
        },
        user: true
      }
    });

    for (const [ingredientId, qty] of ingredientUsage) {
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          stock_qty: {
            decrement: qty
          }
        }
      });
    }

    return createdSale;
  });

  return NextResponse.json({ sale });
}
