import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  // by only matching on the route where it's needed,
  // does not interfere with /xrpc (in particular websockets)
  matcher: '/',
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1'
  }

  if (url.pathname !== '/') {
    const { pathname, search } = url
    url.pathname = '/'
    url.search = ''
    url.searchParams.set('redirect', pathname + search)

    return NextResponse.redirect(url)
  }
}
