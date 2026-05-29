import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const IG_API = "https://graph.instagram.com/v22.0";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();
  if (!contentId)
    return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  // Получить контент + проверить владельца
  const { data: content } = await supabase
    .from("contents")
    .select("*, projects!inner(user_id)")
    .eq("id", contentId)
    .eq("projects.user_id", user.id)
    .single();

  if (!content)
    return NextResponse.json({ error: "Content not found" }, { status: 404 });

  // Получить Instagram интеграцию (token = access_token, channel_id = ig_user_id)
  const { data: integration } = await supabase
    .from("integrations")
    .select("token, channel_id")
    .eq("platform", "instagram")
    .eq("is_active", true)
    .eq("user_id", user.id)
    .single();

  if (!integration) {
    return NextResponse.json(
      { error: "Instagram не подключён. Подключи аккаунт в Интеграциях." },
      { status: 400 },
    );
  }

  const { token: accessToken, channel_id: igUserId } = integration;

  const caption = [
    content.caption || "",
    (content.hashtags || []).map((h: string) => `#${h}`).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    let containerId: string;

    if (content.source_image_url) {
      // Пост с изображением
      const containerRes = await fetch(`${IG_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: content.source_image_url,
          caption,
          access_token: accessToken,
        }),
      });
      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);
      containerId = containerData.id;
    } else {
      // Текстовый пост (Reels или карусель без фото — нужно хотя бы изображение)
      // Если нет картинки — возвращаем понятную ошибку
      return NextResponse.json(
        {
          error:
            "Instagram требует изображение или видео для публикации. Добавь картинку к посту.",
        },
        { status: 400 },
      );
    }

    // Шаг 2 — опубликовать контейнер
    const publishRes = await fetch(`${IG_API}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(publishData.error.message);

    const igMediaId = publishData.id;

    // Обновить статус в БД
    await Promise.all([
      supabase
        .from("contents")
        .update({ status: "published" })
        .eq("id", contentId),
      supabase.from("publish_logs").insert({
        content_id: contentId,
        platform: "instagram",
        status: "published",
        telegram_message_id: null,
      }),
    ]);

    return NextResponse.json({ ok: true, ig_media_id: igMediaId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Instagram publish error";

    await supabase.from("publish_logs").insert({
      content_id: contentId,
      platform: "instagram",
      status: "failed",
      error_message: msg,
    });

    await supabase
      .from("contents")
      .update({ status: "failed" })
      .eq("id", contentId);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
