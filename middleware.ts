import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

const locales = ['ru', 'uz', 'en']
const defaultLocale = 'ru'

const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }

  const isAdminDashboard = /^\/(ru|uz|en)\/admin\/dashboard/.test(pathname)
  const isAdminLogin = /^\/(ru|uz|en)\/admin$/.test(pathname)

  if (isAdminDashboard) {
    const adminToken = request.cookies.get('admin_token')
    if (adminToken?.value !== process.env.ADMIN_SECRET) {
      const locale = pathname.split('/')[1] || defaultLocale
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url))
    }
    return handleI18n(request)
  }
  if (isAdminLogin) return handleI18n(request)

  // Лендинг → сразу на /ads
  const isLanding = /^\/(ru|uz|en)$/.test(pathname)
  if (isLanding) {
    const locale = pathname.split('/')[1] || defaultLocale
    return NextResponse.redirect(new URL(`/${locale}/ads`, request.url))
  }

  return handleI18n(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
