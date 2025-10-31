import { NextResponse } from 'next/server';
import { comparePassword } from '@/lib/auth';
import { attachAuthCookie } from '@/lib/token';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Укажите логин и пароль' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 });
  }

  const valid = await comparePassword(password, user.password);

  if (!valid) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role }
  });

  await attachAuthCookie(response, { userId: user.id, username: user.username, role: user.role });

  return response;
}
