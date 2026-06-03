import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";

const locales = ["ru", "uz", "en"];
const defaultLocale = "ru";

const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем API и статику
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth/callback") ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Admin
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

  // Auth check
  const response = handleI18n(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPattern =
    /^\/(ru|uz|en)\/(dashboard|summary|projects|create|calendar|campaigns|integrations|history|analytics|team|tasks|pipeline|ai-workers|ab-tests|billing|profile|settings|crm|chat|tickets|referral)/;
  const authPattern = /^\/(ru|uz|en)\/auth/;

  if (protectedPattern.test(pathname) && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  if (authPattern.test(pathname) && user) {
    const locale = pathname.split("/")[1] || defaultLocale;

    // Маршрутизация по роли: руководитель попадает на Сводку, остальные — на Главную.
    let dest = "/dashboard";
    try {
      const { data: profile } = await supabase
        .from("profiles") // таблица с plan/role (подтверждено страницей Тарифов)
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "cmo" || profile?.role === "manager") {
        dest = "/summary";
      }
    } catch {
      // роль не прочиталась — остаёмся на дефолте, ничего не ломаем
    }

    return NextResponse.redirect(new URL(`/${locale}${dest}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
