import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel_id, channel_name } = await request.json();
  if (!channel_id) return NextResponse.json({ error: "Missing channel_id" }, { status: 400 });

  const checkRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channel_id }),
  });
  const chatData = await checkRes.json();

  if (!chatData.ok) {
    return NextResponse.json({ error: "Канал не найден. Убедитесь что бот добавлен как администратор." }, { status: 400 });
  }

  const botRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: channel_id,
      user_id: (await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`).then((r) => r.json())).result.id,
    }),
  });
  const botMember = await botRes.json();

  if (botMember.ok) {
    const status = botMember.result?.status;
    if (!["administrator", "creator"].includes(status)) {
      return NextResponse.json({ error: "Бот должен быть администратором канала для публикации." }, { status: 400 });
    }
  }

  await query(
    "INSERT INTO integrations (user_id, platform, token, channel_id, channel_name, is_active) VALUES ($1, 'telegram', $2, $3, $4, true)",
    [user.id, BOT_TOKEN, channel_id, channel_name || chatData.result?.title || channel_id]
  );

  return NextResponse.json({ ok: true, channel_title: chatData.result?.title || channel_id });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, channel_name } = await request.json();
  if (!id || !channel_name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await query(
    "UPDATE integrations SET channel_name = $1 WHERE id = $2 AND user_id = $3",
    [channel_name, id, user.id]
  );

  return NextResponse.json({ ok: true });
}
