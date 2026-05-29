import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_APP_ID = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Определяем locale из referrer или используем "ru" по умолчанию
  const locale = "ru";

  if (error) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?error=instagram_denied`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?error=no_code`, request.url),
    );
  }

  try {
    // Шаг 1 — обменять code на short-lived token
    const tokenRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code,
        }),
      },
    );

    const tokenData = await tokenRes.json();

    if (tokenData.error_type || tokenData.error) {
      throw new Error(tokenData.error_message || tokenData.error);
    }

    const shortLivedToken = tokenData.access_token;
    const igUserId = tokenData.user_id;

    // Шаг 2 — обменять на long-lived token (60 дней)
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedToken}`,
    );
    const longTokenData = await longTokenRes.json();

    const accessToken = longTokenData.access_token || shortLivedToken;

    // Шаг 3 — получить username
    const profileRes = await fetch(
      `https://graph.instagram.com/v22.0/${igUserId}?fields=username,name&access_token=${accessToken}`,
    );
    const profileData = await profileRes.json();
    const username =
      profileData.username || profileData.name || `ig_${igUserId}`;

    // Шаг 4 — сохранить в Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login`, request.url),
      );
    }

    // Проверить не подключён ли уже этот аккаунт
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("platform", "instagram")
      .eq("channel_id", String(igUserId))
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Обновить токен если уже есть
      await supabase
        .from("integrations")
        .update({
          token: accessToken,
          is_active: true,
          channel_name: `@${username}`,
        })
        .eq("id", existing.id);
    } else {
      // Создать новую интеграцию
      await supabase.from("integrations").insert({
        user_id: user.id,
        platform: "instagram",
        token: accessToken,
        channel_id: String(igUserId),
        channel_name: `@${username}`,
        is_active: true,
      });
    }

    // Редирект обратно на интеграции
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?success=instagram`, request.url),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "oauth_error";
    return NextResponse.redirect(
      new URL(
        `/${locale}/integrations?error=${encodeURIComponent(msg)}`,
        request.url,
      ),
    );
  }
}
