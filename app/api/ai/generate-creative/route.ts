import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const platformNames: Record<string, string> = {
  telegram: "Telegram", instagram: "Instagram", tiktok: "TikTok",
  vk: "ВКонтакте", yandex: "Яндекс Директ", google: "Google Ads",
  meta: "Meta Ads", mytarget: "myTarget",
};

const subtypeNames: Record<string, string> = {
  post: "пост", video: "видео-сценарий", ad: "рекламное объявление",
  reels: "Reels сценарий", stories: "Stories", feed: "пост в ленту",
  search: "текстовое объявление", rsya: "баннерный текст",
  display: "медийный баннер", banner: "баннер",
};

const VARIATION_ANGLES = [
  { label: "боль/проблема", instruction: "Начни с конкретной боли или проблемы аудитории — опиши ситуацию которую они узнают, потом предложи решение через продукт." },
  { label: "результат/трансформация", instruction: "Покажи конкретный результат или трансформацию ПОСЛЕ использования продукта — цифры, факты, до/после. Не говори о проблеме — сразу о победе." },
  { label: "социальное доказательство/кейс", instruction: "Напиши от имени клиента или расскажи мини-кейс с реальными деталями (имя/ситуация придумай, но реалистичные). Покажи как конкретный человек решил задачу." },
  { label: "срочность/оффер", instruction: "Сделай упор на ограниченное предложение, дедлайн или уникальный оффер. Создай ощущение что нельзя упустить. Конкретные условия, цифры скидки или бонуса." },
  { label: "любопытство/вопрос", instruction: "Начни с неожиданного вопроса или интригующего факта о нише который заставит остановиться. Потом раскрой связь с продуктом нестандартно." },
];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform, subtype, product, goal, audience, projectName, niche, variationIndex = 0 } = await request.json();

  const angle = VARIATION_ANGLES[variationIndex % VARIATION_ANGLES.length];

  const prompt = `Ты опытный SMM-копирайтер для ниши "${niche || "бизнес"}". Создай ${subtypeNames[subtype] ?? subtype} для ${platformNames[platform] ?? platform}.

ПРОЕКТ: ${projectName}
НИША: ${niche || "не указана"}
ПРОДУКТ/УСЛУГА: ${product || projectName}
ЦЕЛЬ КАМПАНИИ: ${goal}
ЦЕЛЕВАЯ АУДИТОРИЯ: ${audience || "широкая аудитория"}

ОБЯЗАТЕЛЬНЫЙ УГОЛ ПОДАЧИ — "${angle.label}":
${angle.instruction}

ВАЖНО: Пиши конкретно под эту нишу и этот продукт. НЕ используй шаблонные фразы типа "наш продукт", "качественный сервис", "лучшее решение". Говори живым языком, специфичным для ниши.

Требования к формату:
- title: заголовок до 8 слов, цепляющий, специфичный для ниши
- hook: первые 1-2 предложения которые ОСТАНАВЛИВАЮТ прокрутку — угол "${angle.label}"
- caption: полный текст с CTA, естественный для ${platformNames[platform] ?? platform}

Ответ ТОЛЬКО JSON без markdown:
{"title":"...","hook":"...","caption":"..."}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
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
  } catch (err: any) {
    console.error("[ai/generate-creative]", err?.message || err);
    return NextResponse.json({ error: err?.message || "AI error" }, { status: 500 });
  }
}
