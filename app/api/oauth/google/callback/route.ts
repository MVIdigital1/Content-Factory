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

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    console.error("[google/callback] token error:", tokens);
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=google_failed`);
  }

  const { error } = await supabase.from("ad_platforms").upsert(
    {
      user_id: user.id,
      platform_key: "google",
      name: "Google Ads",
      color: "#34A853",
      abbr: "G",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      is_active: true,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform_key" }
  );

  if (error) {
    console.error("[google/callback] upsert error:", error);
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=google_save_failed`);
  }

  return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?tab=ads&success=google`);
}
