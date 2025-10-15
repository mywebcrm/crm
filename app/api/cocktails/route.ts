import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const cocktails = await prisma.cocktail.findMany({
    include: {
      category: true,
      recipe: {
        include: {
          ingredient: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ cocktails });
}
