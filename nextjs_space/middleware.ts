import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthTokenEdge, AUTH_COOKIE_NAME, AuthRole } from '@/lib/auth-edge';

const PUBLIC_ROUTES = [
  '/',
  '/entrar',
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
];

// Routes that require authentication but are accessible by all roles
const AUTHENTICATED_ROUTES = [
  '/perfil',
];

const ROLE_ROUTES: Record<string, AuthRole[]> = {
  '/admin': ['ADMIN'],
  '/nutricionista': ['ADMIN', 'NUTRITIONIST'],
  '/medico': ['ADMIN', 'NUTRITIONIST'],
  '/paciente': ['ADMIN', 'NUTRITIONIST', 'PATIENT'],
  '/dashboard': ['ADMIN', 'NUTRITIONIST'],
  '/visualizador': ['ADMIN', 'NUTRITIONIST', 'PATIENT'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and non-auth API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/og-') ||
    pathname.includes('.') ||
    (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login'))
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthTokenEdge(token);

  if (!payload) {
    const loginUrl = new URL('/entrar', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow authenticated routes for all logged-in users
  const isAuthenticatedRoute = AUTHENTICATED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  
  if (isAuthenticatedRoute) {
    return NextResponse.next();
  }

  // Check role-based access
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + '/')) {
      if (!allowedRoles.includes(payload.role)) {
        // Redirect to appropriate area based on role
        const redirectMap: Record<AuthRole, string> = {
          ADMIN: '/admin',
          NUTRITIONIST: '/nutricionista',
          PATIENT: '/paciente',
        };
        return NextResponse.redirect(new URL(redirectMap[payload.role], request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
