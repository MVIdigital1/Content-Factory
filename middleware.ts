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

  // ── 1. Пропускаем API, статику и auth callback ──────────────────────────────
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth/callback") ||
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

  // ── 3. Лендинг — /(ru|uz|en) без подпути ───────────────────────────────────
  // Неавторизованный → показываем лендинг
  // Авторизованный  → редиректим сразу на дашборд (не нужно видеть лендинг)
  const isLanding = /^\/(ru|uz|en)$/.test(pathname);

  // ── 4. Инициализируем Supabase и получаем пользователя ──────────────────────
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

  // ── 5. Лендинг-логика ───────────────────────────────────────────────────────
  if (isLanding) {
    if (user) {
      // Авторизован → сразу в кабинет, лендинг ему не нужен
      const locale = pathname.split("/")[1] || defaultLocale;

      let dest = "/dashboard";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "cmo" || profile?.role === "manager") {
          dest = "/summary";
        }
      } catch {
        // роль не прочиталась — остаёмся на дефолте
      }

      return NextResponse.redirect(new URL(`/${locale}${dest}`, request.url));
    }
    // Не авторизован → показываем лендинг (page.tsx)
    return response;
  }

  // ── 6. Защищённые маршруты — требуют авторизации ────────────────────────────
  const protectedPattern =
    /^\/(ru|uz|en)\/(dashboard|summary|projects|create|calendar|campaigns|integrations|history|analytics|team|tasks|pipeline|ai-workers|ab-tests|billing|profile|settings|crm|chat|tickets|referral)/;

  if (protectedPattern.test(pathname) && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  // ── 7. Auth страницы — если уже авторизован, редирект в кабинет ─────────────
  const authPattern = /^\/(ru|uz|en)\/auth/;

  if (authPattern.test(pathname) && user) {
    const locale = pathname.split("/")[1] || defaultLocale;

    let dest = "/dashboard";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "cmo" || profile?.role === "manager") {
        dest = "/summary";
      }
    } catch {
      // роль не прочиталась — остаёмся на дефолте
    }

    return NextResponse.redirect(new URL(`/${locale}${dest}`, request.url));
  }

  // ── 8. Всё остальное — пропускаем ───────────────────────────────────────────
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
