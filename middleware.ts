import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.has('auth')
  
  console.log('Middleware check:', {
    path: pathname,
    isAuthenticated,
    cookies: request.cookies.getAll()
  })

  // 如果访问根路径，重定向到登录页
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 如果已登录用户访问登录页，重定向到主页
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // 如果未登录用户访问需要认证的页面，重定向到登录页
  if (!isAuthenticated && pathname !== '/login') {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
} 