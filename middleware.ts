import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { extractAdminAccessToken } from '@/lib/auth/admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApiPath = pathname.startsWith('/api/admin');

  if (pathname === '/login' || pathname.startsWith('/api/admin/login') || pathname.startsWith('/api/admin/logout')) {
    return NextResponse.next();
  }

  if (!isAdminPath && !isAdminApiPath) {
    return NextResponse.next();
  }

  const token = extractAdminAccessToken(request);
  if (!token) {
    if (isAdminApiPath) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};