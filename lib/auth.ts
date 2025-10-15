import type { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { getTokenFromRequest, verifyToken } from './token';

export async function getCurrentUser(req?: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    return prisma.user.findUnique({ where: { id: payload.userId } });
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string) {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}
