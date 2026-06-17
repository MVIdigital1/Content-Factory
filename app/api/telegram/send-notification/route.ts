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

  const { message, type = "info" } = await request.json();

  // Получить Telegram chat_id пользователя из профиля
  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .single();

  if (!profile?.telegram_chat_id) {
    return NextResponse.json(
      {
        error:
          "Telegram не привязан. Напишите боту /start чтобы получать уведомления.",
      },
      { status: 400 },
    );
  }

  const emoji = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  const text = `${emoji} *MVI Content Factory*\n\n${message}`;

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text,
        parse_mode: "Markdown",
      }),
    },
  );

  const data = await res.json();
  if (!data.ok)
    return NextResponse.json({ error: data.description }, { status: 500 });

  return NextResponse.json({ ok: true });
}
