import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ только для админа' }, { status: 403 });
  }

  const { userId, role } = await request.json();

  if (!userId || !role) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: Number(userId) },
    data: { role }
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ только для админа' }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: 'Укажите пользователя' }, { status: 400 });
  }

  if (Number(userId) === user.id) {
    return NextResponse.json({ error: 'Нельзя удалить себя' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: Number(userId) } });

  return NextResponse.json({ success: true });
}
