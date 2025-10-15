import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { seedDatabase } from '@/lib/seed-data';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'bartender') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const [users, ingredients, cocktails, sales] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true, role: true, created_at: true } }),
    prisma.ingredient.findMany(),
    prisma.cocktail.findMany({ include: { recipe: true, category: true } }),
    prisma.sale.findMany({ include: { items: true, user: true } })
  ]);

  return NextResponse.json({ users, ingredients, cocktails, sales });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ только для админа' }, { status: 403 });
  }

  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'reset') {
    await prisma.$transaction([
      prisma.saleItem.deleteMany(),
      prisma.sale.deleteMany(),
      prisma.recipe.deleteMany(),
      prisma.cocktail.deleteMany(),
      prisma.ingredient.deleteMany(),
      prisma.category.deleteMany(),
      prisma.user.deleteMany()
    ]);
    await seedDatabase(prisma);
    const redirectUrl = new URL('/settings?reset=1', request.url);
    const response = NextResponse.redirect(redirectUrl);
    return response;
  }

  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
