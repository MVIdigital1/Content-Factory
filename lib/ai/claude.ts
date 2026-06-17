import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Ты — профессиональный SMM-копирайтер и контент-стратег.
Ты работаешь в платформе MVI Content Factory и помогаешь брендам создавать вирусный контент для соцсетей.
Правила:
- Всегда отвечай ТОЛЬКО валидным JSON без markdown-обёртки и без пояснений
- Пиши живо, ёмко, без воды и канцелярита
- Хук должен цеплять с первой строки — вопрос, провокация или неожиданный факт
- Caption адаптируй под платформу: Telegram — длиннее, Instagram — короче и с эмодзи
- Хэштеги без # в массиве, они добавляются автоматически`;

const langMap: Record<string, string> = {
  ru: "русском",
  uz: "узбекском",
  en: "английском",
};

const toneMap: Record<string, string> = {
  friendly: "дружелюбном и разговорном",
  expert: "экспертном и профессиональном",
  viral: "вирусном и эмоциональном",
  premium: "премиум и элегантном",
};

function parseJSON(raw: string): Record<string, unknown> {
  // Strip markdown fences if present
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(clean);
}

function validateResult(obj: Record<string, unknown>): void {
  const required = ["title", "hook", "caption", "hashtags", "cta"];
  for (const key of required) {
    if (!obj[key]) throw new Error(`Missing field: ${key}`);
  }
  if (!Array.isArray(obj.hashtags)) throw new Error("hashtags must be array");
}

export async function generateContent({
  projectName,
  niche,
  description,
  audience,
  tone,
  language,
  platform,
  contentType,
  goal,
  topic,
  imageUrl,
  stopWords,
  recentPosts,
}: {
  projectName: string;
  niche: string;
  description: string;
  audience: string;
  tone: string;
  language: string;
  platform: string;
  contentType: string;
  goal: string;
  topic: string;
  imageUrl?: string | null;
  stopWords?: string | null;
  recentPosts?: string[];
}) {
  const imageInstruction = imageUrl
    ? `\nИЗОБРАЖЕНИЕ: К посту прикреплена картинка (${imageUrl}). Пиши текст который дополняет визуал.`
    : "";

  const stopWordsInstruction =
    stopWords && stopWords.trim()
      ? `\nСТОП-СЛОВА — никогда не использовать: ${stopWords}`
      : "";

  const recentPostsInstruction =
    recentPosts && recentPosts.length > 0
      ? `\nПРИМЕРЫ ПРОШЛЫХ ПОСТОВ БРЕНДА (учти стиль):\n${recentPosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";

  const prompt = `БРЕНД: ${projectName}
НИША: ${niche}
ОПИСАНИЕ: ${description}
АУДИТОРИЯ: ${audience}
ТОН: ${toneMap[tone] || tone}
ЯЗЫК: ${langMap[language] || language}
ПЛАТФОРМА: ${platform}
ТИП КОНТЕНТА: ${contentType}
ЦЕЛЬ: ${goal}
ТЕМА: ${topic}${imageInstruction}${stopWordsInstruction}${recentPostsInstruction}

Ответь ТОЛЬКО в формате JSON:
{
  "title": "короткое название поста",
  "idea": "основная идея 1-2 предложения",
  "hook": "цепляющее начало поста",
  "caption": "готовый текст поста для ${platform}",
  "hashtags": ["хэштег1", "хэштег2", "хэштег3", "хэштег4", "хэштег5"],
  "cta": "призыв к действию",
  "script": [
    { "scene": 1, "text": "текст сцены", "duration": "3 сек" }
  ],
  "voiceover": "текст для голоса (если видео)",
  "screen_text": "текст на экране (если видео)"
}`;

  // Retry до 3 раз с валидацией JSON
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (message.content[0] as { text: string }).text;
      const result = parseJSON(raw) as Record<string, unknown>;
      validateResult(result);
      return result;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  throw lastError || new Error("Generation failed after 3 attempts");
}
