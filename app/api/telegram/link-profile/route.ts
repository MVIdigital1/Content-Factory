import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function generateToken() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = generateToken();

  await supabase
    .from("profiles")
    .upsert({ id: user.id, telegram_link_token: token })
    .eq("id", user.id);

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot";

  return NextResponse.json({
    token,
    instruction: `Напишите боту @${botUsername} команду:\n/link ${token}`,
    bot_url: `https://t.me/${botUsername}?start=link_${token}`,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_link_token: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
