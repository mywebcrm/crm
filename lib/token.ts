import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

export const TOKEN_COOKIE = 'barcrm_token';

const SECRET = process.env.NEXTAUTH_SECRET ?? 'barcrm-secret';
const secretKey = new TextEncoder().encode(SECRET);

export type TokenPayload = {
  userId: number;
  username: string;
  role: string;
};

export async function createToken(payload: TokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify<TokenPayload>(token, secretKey, {
    algorithms: ['HS256']
  });
  return payload;
}

export function getTokenFromRequest(req?: NextRequest) {
  if (req) {
    return req.cookies.get(TOKEN_COOKIE)?.value;
  }
  return cookies().get(TOKEN_COOKIE)?.value;
}

export async function attachAuthCookie(response: NextResponse, payload: TokenPayload) {
  const token = await createToken(payload);
  response.cookies.set({
    name: TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: TOKEN_COOKIE,
    value: '',
    path: '/',
    maxAge: 0
  });
}
