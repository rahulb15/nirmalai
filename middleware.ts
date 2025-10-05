import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Log all API requests for debugging
  if (pathname.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    
    // Log upload requests in detail
    if (pathname === '/api/upload') {
      console.log('=== UPLOAD REQUEST INTERCEPTED ===');
      console.log('Content-Type:', request.headers.get('content-type'));
      console.log('Content-Length:', request.headers.get('content-length'));
      console.log('Has auth-token:', !!request.cookies.get('auth-token')?.value);
    }
  }

  // Allow public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // For API routes, return JSON error instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: No authentication token' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify JWT token
    await jwtVerify(token, JWT_SECRET);
    
    // Allow request to proceed
    return NextResponse.next();
    
  } catch (error: any) {
    console.error('JWT verification failed:', error.message);
    
    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Unauthorized: Invalid or expired token',
          debug: { message: error.message }
        },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For page routes, redirect to login and clear cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};