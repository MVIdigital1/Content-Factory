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

  const tokenRes = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: process.env.NEXT_PUBLIC_META_REDIRECT_URI,
      code,
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    console.error("[meta/callback] token error:", tokens);
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=meta_failed`);
  }

  // Fetch ad accounts
  const accountRes = await fetch(
    `https://graph.facebook.com/me/adaccounts?access_token=${tokens.access_token}&fields=id,name`
  );
  const accountData = await accountRes.json();
  const firstAccount = accountData.data?.[0];

  const { error } = await supabase.from("ad_platforms").upsert(
    {
      user_id: user.id,
      platform_key: "meta",
      name: "Meta Ads",
      color: "#1877F2",
      abbr: "M",
      access_token: tokens.access_token,
      ad_account_id: firstAccount?.id ?? null,
      is_active: true,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform_key" }
  );

  if (error) {
    console.error("[meta/callback] upsert error:", error);
    return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?error=meta_save_failed`);
  }

  return NextResponse.redirect(`${REDIRECT_BASE}/ru/integrations?tab=ads&success=meta`);
}
