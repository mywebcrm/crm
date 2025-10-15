import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ ingredients });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'bartender') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const body = await request.json();
  const id = Number(body.id);
  const stock_qty = Number(body.stock_qty);
  const min_qty = Number(body.min_qty);

  if (!Number.isFinite(id) || Number.isNaN(stock_qty) || Number.isNaN(min_qty)) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      stock_qty,
      min_qty
    }
  });

  return NextResponse.json({ ingredient });
}
