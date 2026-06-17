import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!; // Без NEXT_PUBLIC_

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel_id, channel_name } = await request.json();
  if (!channel_id)
    return NextResponse.json({ error: "Missing channel_id" }, { status: 400 });

  // Проверить что бот является администратором канала
  const checkRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getChat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel_id }),
    },
  );
  const chatData = await checkRes.json();

  if (!chatData.ok) {
    return NextResponse.json(
      {
        error: "Канал не найден. Убедитесь что бот добавлен как администратор.",
      },
      { status: 400 },
    );
  }

  // Проверить права бота в канале
  const botRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channel_id,
        user_id: (
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`).then(
            (r) => r.json(),
          )
        ).result.id,
      }),
    },
  );
  const botMember = await botRes.json();

  if (botMember.ok) {
    const status = botMember.result?.status;
    if (!["administrator", "creator"].includes(status)) {
      return NextResponse.json(
        { error: "Бот должен быть администратором канала для публикации." },
        { status: 400 },
      );
    }
  }

  // Сохранить интеграцию — токен хранится только на сервере
  const { error } = await supabase.from("integrations").insert({
    user_id: user.id,
    platform: "telegram",
    token: BOT_TOKEN, // Из server env, клиент никогда не видит
    channel_id,
    channel_name: channel_name || chatData.result?.title || channel_id,
    is_active: true,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    channel_title: chatData.result?.title || channel_id,
  });
}

// Редактирование названия канала
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, channel_name } = await request.json();
  if (!id || !channel_name)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { error } = await supabase
    .from("integrations")
    .update({ channel_name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
