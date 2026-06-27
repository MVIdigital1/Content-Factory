import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const locales = ["ru", "uz", "en"];
const defaultLocale = "ru";

const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Пропускаем API, статику ──────────────────────────────────────────────
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // ── 2. Admin маршруты ───────────────────────────────────────────────────────
  const isAdminDashboard = /^\/(ru|uz|en)\/admin\/dashboard/.test(pathname);
  const isAdminLogin = /^\/(ru|uz|en)\/admin$/.test(pathname);

  if (isAdminDashboard) {
    const adminToken = request.cookies.get("admin_token");
    if (adminToken?.value !== process.env.ADMIN_SECRET) {
      const locale = pathname.split("/")[1] || defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }
    return handleI18n(request);
  }
  if (isAdminLogin) return handleI18n(request);

  // ── 3. Получаем пользователя из JWT cookie ──────────────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? verifyToken(token) : null;

  const response = handleI18n(request);

  // ── 4. Лендинг ──────────────────────────────────────────────────────────────
  const isLanding = /^\/(ru|uz|en)$/.test(pathname);
  if (isLanding) {
    if (user) {
      const locale = pathname.split("/")[1] || defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
    return response;
  }

  // ── 5. Защищённые маршруты ──────────────────────────────────────────────────
  const protectedPattern =
    /^\/(ru|uz|en)\/(dashboard|summary|projects|create|calendar|campaigns|integrations|history|analytics|team|tasks|pipeline|ai-workers|ab-tests|billing|profile|settings|crm|chat|tickets|referral|landings|infographics|tokens)/;

  if (protectedPattern.test(pathname) && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  // ── 6. Auth страницы — если уже авторизован ─────────────────────────────────
  const authPattern = /^\/(ru|uz|en)\/auth/;
  if (authPattern.test(pathname) && user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
