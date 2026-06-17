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

  const { channel_id } = await request.json();
  if (!channel_id)
    return NextResponse.json({ error: "Missing channel_id" }, { status: 400 });

  const [chatRes, countRes] = await Promise.all([
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel_id }),
    }),
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel_id }),
    }),
  ]);

  const chatData = await chatRes.json();
  const countData = await countRes.json();

  // Посты за последние 7 дней из нашей БД
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { count: postsThisWeek } = await supabase
    .from("publish_logs")
    .select("*", { count: "exact", head: true })
    .eq("platform", "telegram")
    .eq("status", "published")
    .gte("created_at", sevenDaysAgo);

  const { data: lastPost } = await supabase
    .from("publish_logs")
    .select("created_at")
    .eq("platform", "telegram")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    ok: true,
    title: chatData.result?.title || channel_id,
    description: chatData.result?.description || null,
    member_count: countData.ok ? countData.result : null,
    posts_this_week: postsThisWeek ?? 0,
    last_post_at: lastPost?.created_at || null,
  });
}
