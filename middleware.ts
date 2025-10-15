import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE, verifyToken } from '@/lib/token';

const PUBLIC_PATHS = ['/', '/register', '/api/auth/login', '/api/auth/register'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch (error) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
