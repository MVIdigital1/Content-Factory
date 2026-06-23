import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const REDIRECT_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=no_code`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/auth/login`);
  }

  const tokenRes = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID ?? "",
      client_secret: process.env.YANDEX_CLIENT_SECRET ?? "",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    console.error("[yandex/callback] token error:", tokens);
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=yandex_failed`);
  }

  const { error } = await supabase.from("ad_platforms").upsert(
    {
      user_id: user.id,
      platform_key: "yandex",
      name: "Яндекс Директ",
      color: "#FFDB4D",
      abbr: "Я",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      is_active: true,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform_key" }
  );

  if (error) {
    console.error("[yandex/callback] upsert error:", error);
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=yandex_save_failed`);
  }

  return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?tab=ads&success=yandex`);
}
