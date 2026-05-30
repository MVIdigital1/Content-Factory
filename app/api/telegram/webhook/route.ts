import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const text: string = message.text || "";
    const username: string = message.from?.username || "";

    // /start
    if (text.startsWith("/start")) {
      await sendMessage(
        chatId,
        `👋 Привет! Я бот MVI Content Factory.

Чтобы получать уведомления о публикациях, привяжи свой аккаунт:

1. Зайди в *Профиль* на сайте
2. Нажми *"Привязать Telegram"*
3. Получи код и отправь мне: \`/link КОД\``,
      );
      return NextResponse.json({ ok: true });
    }

    // /link TOKEN
    if (text.startsWith("/link ")) {
      const token = text.replace("/link ", "").trim();
      if (!token) {
        await sendMessage(chatId, "❌ Укажи код. Пример: `/link ABC123`");
        return NextResponse.json({ ok: true });
      }

      const supabase = await createClient();

      // Найти профиль по токену
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, telegram_chat_id")
        .eq("telegram_link_token", token)
        .single();

      if (!profile) {
        await sendMessage(
          chatId,
          "❌ Неверный или устаревший код. Получи новый в Профиле на сайте.",
        );
        return NextResponse.json({ ok: true });
      }

      if (profile.telegram_chat_id) {
        await sendMessage(chatId, "✅ Telegram уже привязан к этому аккаунту!");
        return NextResponse.json({ ok: true });
      }

      // Сохранить chat_id и очистить токен
      await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId, telegram_link_token: null })
        .eq("id", profile.id);

      await sendMessage(
        chatId,
        `✅ *Telegram успешно привязан!*

Теперь ты будешь получать уведомления:
• После публикации поста
• Еженедельный отчёт каждый понедельник
• Важные события аккаунта`,
      );

      return NextResponse.json({ ok: true });
    }

    // Другие сообщения
    await sendMessage(
      chatId,
      "Используй /start для начала или /link КОД для привязки аккаунта.",
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
