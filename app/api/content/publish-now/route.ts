import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!; // Без NEXT_PUBLIC_

async function logPublish(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentId: string,
  platform: string,
  status: "published" | "failed",
  error?: string,
  messageId?: number,
) {
  await supabase.from("publish_logs").insert({
    content_id: contentId,
    platform,
    status,
    error_message: error || null,
    telegram_message_id: messageId || null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId, platform } = await request.json();
  if (!contentId)
    return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  // Получить контент + проверить владельца через projects
  const { data: content } = await supabase
    .from("contents")
    .select("*, projects!inner(user_id)")
    .eq("id", contentId)
    .eq("projects.user_id", user.id) // ← проверка владельца
    .single();

  if (!content)
    return NextResponse.json(
      { error: "Content not found or access denied" },
      { status: 404 },
    );

  if (platform === "telegram") {
    const { data: integration } = await supabase
      .from("integrations")
      .select("channel_id")
      .eq("platform", "telegram")
      .eq("is_active", true)
      .eq("user_id", user.id)
      .single();

    if (!integration)
      return NextResponse.json(
        { error: "No active Telegram channel. Connect one first." },
        { status: 400 },
      );

    const text =
      `${content.caption || ""}\n\n${(content.hashtags || []).map((h: string) => `#${h}`).join(" ")}`.trim();
    const imageUrl = content.source_image_url;

    const endpoint = imageUrl ? "sendPhoto" : "sendMessage";
    const body = imageUrl
      ? {
          chat_id: integration.channel_id,
          photo: imageUrl,
          caption: text,
          parse_mode: "HTML",
        }
      : { chat_id: integration.channel_id, text, parse_mode: "HTML" };

    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const tgData = await res.json();

    if (!tgData.ok) {
      await logPublish(
        supabase,
        contentId,
        "telegram",
        "failed",
        tgData.description,
      );
      await supabase
        .from("contents")
        .update({ status: "failed" })
        .eq("id", contentId);
      return NextResponse.json(
        { error: tgData.description || "Telegram error" },
        { status: 500 },
      );
    }

    const messageId: number = tgData.result.message_id;

    // Сохранить message_id + статус
    await Promise.all([
      supabase
        .from("contents")
        .update({ status: "published" })
        .eq("id", contentId),
      supabase
        .from("scheduled_posts")
        .update({
          telegram_message_id: messageId,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("content_id", contentId),
      logPublish(
        supabase,
        contentId,
        "telegram",
        "published",
        undefined,
        messageId,
      ),
    ]);

    return NextResponse.json({ ok: true, message_id: messageId });
  }

  // Другие платформы — Make.com webhook
  const makeUrl = process.env.MAKE_WEBHOOK_URL;
  if (makeUrl) {
    try {
      await fetch(makeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          platform,
          caption: content.caption || "",
          hashtags: content.hashtags || [],
          image_url: content.source_image_url || null,
        }),
      });
    } catch {
      // Make.com недоступен — не блокируем
    }
  }

  await supabase
    .from("contents")
    .update({ status: "published" })
    .eq("id", contentId);
  await logPublish(supabase, contentId, platform, "published");

  return NextResponse.json({ ok: true, via: "make" });
}
