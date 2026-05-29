import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const routing = defineRouting({
  locales: ["ru", "uz", "en"],
  defaultLocale: "ru",
  localePrefix: "always",
});

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const isAdminDashboard = /^\/(ru|uz|en)\/admin\/dashboard/.test(pathname);
  const isAdminLogin = /^\/(ru|uz|en)\/admin$/.test(pathname);

  if (isAdminDashboard) {
    const adminToken = request.cookies.get("admin_token");
    if (adminToken?.value !== process.env.ADMIN_SECRET) {
      const locale = pathname.split("/")[1] || "ru";
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }
    return intlMiddleware(request);
  }

  if (isAdminLogin) {
    return intlMiddleware(request);
  }

  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    /^\/(ru|uz|en)\/(dashboard|projects|create|calendar|integrations|history|analytics|team|tasks|pipeline)/.test(
      pathname,
    );
  const isAuthPage = /^\/(ru|uz|en)\/auth/.test(pathname);

  if (isProtected && !user) {
    const locale = pathname.split("/")[1] || "ru";
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  if (isAuthPage && user) {
    const locale = pathname.split("/")[1] || "ru";
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
