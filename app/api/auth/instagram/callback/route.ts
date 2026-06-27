import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_APP_ID = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const locale = "ru";

  if (error) return NextResponse.redirect(new URL(`/${locale}/integrations?error=instagram_denied`, request.url));
  if (!code) return NextResponse.redirect(new URL(`/${locale}/integrations?error=no_code`, request.url));

  try {
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: INSTAGRAM_APP_ID, client_secret: INSTAGRAM_APP_SECRET, grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error_type || tokenData.error) throw new Error(tokenData.error_message || tokenData.error);

    const shortLivedToken = tokenData.access_token;
    const igUserId = tokenData.user_id;

    const longTokenRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedToken}`);
    const longTokenData = await longTokenRes.json();
    const accessToken = longTokenData.access_token || shortLivedToken;

    const profileRes = await fetch(`https://graph.instagram.com/v22.0/${igUserId}?fields=username,name&access_token=${accessToken}`);
    const profileData = await profileRes.json();
    const username = profileData.username || profileData.name || `ig_${igUserId}`;

    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM integrations WHERE platform = 'instagram' AND channel_id = $1 AND user_id = $2",
      [String(igUserId), user.id]
    );

    if (existing) {
      await query("UPDATE integrations SET token = $1, is_active = true, channel_name = $2 WHERE id = $3",
        [accessToken, `@${username}`, existing.id]);
    } else {
      await query(
        "INSERT INTO integrations (user_id, platform, token, channel_id, channel_name, is_active) VALUES ($1, 'instagram', $2, $3, $4, true)",
        [user.id, accessToken, String(igUserId), `@${username}`]
      );
    }

    return NextResponse.redirect(new URL(`/${locale}/integrations?success=instagram`, request.url));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "oauth_error";
    return NextResponse.redirect(new URL(`/${locale}/integrations?error=${encodeURIComponent(msg)}`, request.url));
  }
}
