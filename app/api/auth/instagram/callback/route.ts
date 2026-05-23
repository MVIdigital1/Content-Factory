import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/en/integrations?error=instagram_denied`,
    );
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/en/integrations?error=instagram_token`,
    );
  }

  // Get long-lived token
  const longTokenRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`,
  );
  const longTokenData = await longTokenRes.json();
  const finalToken = longTokenData.access_token || tokenData.access_token;

  // Get Instagram user info
  const userRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username&access_token=${finalToken}`,
  );
  const userData = await userRes.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/en/auth/login`,
    );
  }

  // Check if this exact Instagram account already connected
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .eq("channel_id", userData.id)
    .maybeSingle();

  if (existing) {
    // Just update the token
    await supabase
      .from("integrations")
      .update({ token: finalToken, is_active: true })
      .eq("id", existing.id);
  } else {
    // Add new Instagram account
    await supabase.from("integrations").insert({
      user_id: user.id,
      platform: "instagram",
      token: finalToken,
      channel_id: userData.id,
      channel_name: `@${userData.username}`,
      is_active: true,
    });
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/en/integrations?success=instagram`,
  );
}
