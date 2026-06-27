import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel_id } = await request.json();
  if (!channel_id) return NextResponse.json({ error: "Missing channel_id" }, { status: 400 });

  const [chatRes, countRes] = await Promise.all([
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel_id }),
    }),
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel_id }),
    }),
  ]);

  const chatData = await chatRes.json();
  const countData = await countRes.json();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const postsCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM publish_logs WHERE platform = 'telegram' AND status = 'published' AND created_at >= $1",
    [sevenDaysAgo]
  );
  const lastPost = await queryOne<{ created_at: string }>(
    "SELECT created_at FROM publish_logs WHERE platform = 'telegram' AND status = 'published' ORDER BY created_at DESC LIMIT 1",
    []
  );

  return NextResponse.json({
    ok: true,
    title: chatData.result?.title || channel_id,
    description: chatData.result?.description || null,
    member_count: countData.ok ? countData.result : null,
    posts_this_week: parseInt(postsCount?.count ?? "0"),
    last_post_at: lastPost?.created_at || null,
  });
}
