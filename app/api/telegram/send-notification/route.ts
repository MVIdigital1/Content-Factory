import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, type = "info" } = await request.json();

  const profile = await queryOne<{ telegram_chat_id: string }>(
    "SELECT phone FROM profiles WHERE id = $1",
    [user.id]
  );

  return NextResponse.json({ error: "Telegram уведомления будут доступны после привязки профиля" }, { status: 400 });
}
