import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

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

  // Получить scheduled_post с message_id + проверить владельца
  const { data: scheduledPost } = await supabase
    .from("scheduled_posts")
    .select("*, contents!inner(*, projects!inner(user_id))")
    .eq("content_id", contentId)
    .eq("contents.projects.user_id", user.id)
    .not("telegram_message_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!scheduledPost?.telegram_message_id) {
    return NextResponse.json(
      {
        error:
          "Нет message_id — пост не был опубликован через бота или message_id не сохранён",
      },
      { status: 400 },
    );
  }

  // Получить channel_id
  const { data: integration } = await supabase
    .from("integrations")
    .select("channel_id")
    .eq("platform", "telegram")
    .eq("is_active", true)
    .eq("user_id", user.id)
    .single();

  if (!integration)
    return NextResponse.json(
      { error: "Нет активного Telegram канала" },
      { status: 400 },
    );

  // Удалить сообщение из Telegram
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: integration.channel_id,
        message_id: scheduledPost.telegram_message_id,
      }),
    },
  );

  const tgData = await res.json();

  if (
    !tgData.ok &&
    tgData.description !== "Bad Request: message to delete not found"
  ) {
    return NextResponse.json(
      { error: tgData.description || "Ошибка удаления из Telegram" },
      { status: 500 },
    );
  }

  // Обновить статус контента обратно на draft
  await Promise.all([
    supabase.from("contents").update({ status: "draft" }).eq("id", contentId),
    supabase
      .from("scheduled_posts")
      .update({
        telegram_message_id: null,
        status: "failed",
      })
      .eq("id", scheduledPost.id),
  ]);

  return NextResponse.json({ ok: true });
}
