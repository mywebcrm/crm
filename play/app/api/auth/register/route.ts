import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { attachAuthCookie } from '@/lib/token';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const role = String(body.role ?? 'bartender');

  if (!username || !password) {
    return NextResponse.json({ error: 'Заполните логин и пароль' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: 'Логин уже используется' }, { status: 409 });
  }

  const currentUser = await getCurrentUser(request);
  const totalUsers = await prisma.user.count();

  let targetRole = 'bartender';

  if (role !== 'bartender') {
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Только администратор может назначать роли' }, { status: 403 });
    }
    targetRole = role;
  } else {
    targetRole = role;
  }

  if (totalUsers > 0 && !currentUser && targetRole !== 'bartender') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { username, password: hashed, role: targetRole }
  });

  const safeUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    created_at: user.created_at
  };

  const response = NextResponse.json({ user: safeUser });

  if (!currentUser) {
    await attachAuthCookie(response, { userId: user.id, username: user.username, role: user.role });
  }

  return response;
}
