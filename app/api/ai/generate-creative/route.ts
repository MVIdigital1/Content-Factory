import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const platformNames: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
  vk: "ВКонтакте",
  yandex: "Яндекс Директ",
  google: "Google Ads",
  meta: "Meta Ads",
  mytarget: "myTarget",
};

const subtypeNames: Record<string, string> = {
  post: "пост",
  video: "видео-сценарий",
  ad: "рекламное объявление",
  reels: "Reels сценарий",
  stories: "Stories",
  feed: "пост в ленту",
  search: "текстовое объявление",
  rsya: "баннерный текст",
  display: "медийный баннер",
  banner: "баннер",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform, subtype, product, goal, audience, projectName } =
    await request.json();

  const prompt = `Создай ${subtypeNames[subtype] ?? subtype} для платформы ${platformNames[platform] ?? platform}.

Продукт/бизнес: ${product || projectName}
Цель кампании: ${goal}
Целевая аудитория: ${audience || "широкая аудитория"}

Требования:
- Заголовок (title): короткий, цепляющий, до 10 слов
- Хук (hook): первое предложение которое останавливает прокрутку
- Текст (caption): полный текст поста/объявления с CTA

Отвечай ТОЛЬКО в JSON формате без markdown:
{"title":"...","hook":"...","caption":"..."}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { text: string }).text;
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ title: "Креатив", hook: "", caption: raw });
  }
}
