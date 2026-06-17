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

  // Получить message_id и channel_id
  const { data: scheduledPost } = await supabase
    .from("scheduled_posts")
    .select("telegram_message_id, contents!inner(*, projects!inner(user_id))")
    .eq("content_id", contentId)
    .eq("contents.projects.user_id", user.id)
    .not("telegram_message_id", "is", null)
    .single();

  if (!scheduledPost?.telegram_message_id) {
    return NextResponse.json(
      { error: "Нет message_id для этого поста" },
      { status: 400 },
    );
  }

  const { data: integration } = await supabase
    .from("integrations")
    .select("channel_id")
    .eq("platform", "telegram")
    .eq("is_active", true)
    .eq("user_id", user.id)
    .single();

  if (!integration)
    return NextResponse.json({ error: "Нет канала" }, { status: 400 });

  // Получить статистику поста
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getMessageStatistics`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: integration.channel_id,
        message_id: scheduledPost.telegram_message_id,
      }),
    },
  );

  const data = await res.json();

  // Получить реакции
  const reactRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getMessageReactionCount`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: integration.channel_id,
        message_id: scheduledPost.telegram_message_id,
      }),
    },
  );
  const reactData = await reactRes.json();

  const views = data.result?.views || 0;
  const forwards = data.result?.forwards || 0;
  const reactions =
    reactData.result?.reactions?.reduce(
      (sum: number, r: any) => sum + (r.count || 0),
      0,
    ) || 0;

  return NextResponse.json({
    views,
    forwards,
    reactions,
    message_id: scheduledPost.telegram_message_id,
  });
}
