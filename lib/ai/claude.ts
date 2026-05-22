import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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
}) {
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

  const imageInstruction = imageUrl
    ? `\nИЗОБРАЖЕНИЕ: К посту прикреплена картинка (${imageUrl}). Учти это при создании контента — пиши текст который дополняет визуал.`
    : "";

  const prompt = `Ты — профессиональный SMM-копирайтер. Создай контент для бренда.

БРЕНД: ${projectName}
НИША: ${niche}
ОПИСАНИЕ: ${description}
АУДИТОРИЯ: ${audience}
ТОН: ${toneMap[tone] || tone}
ЯЗЫК: ${langMap[language] || language}
ПЛАТФОРМА: ${platform}
ТИП КОНТЕНТА: ${contentType}
ЦЕЛЬ: ${goal}
ТЕМА: ${topic}${imageInstruction}

Ответь ТОЛЬКО в формате JSON без markdown:
{
  "title": "короткое название",
  "idea": "основная идея 1-2 предложения",
  "hook": "цепляющее начало",
  "caption": "готовый текст поста",
  "hashtags": ["хэштег1", "хэштег2", "хэштег3", "хэштег4", "хэштег5"],
  "cta": "призыв к действию",
  "script": [
    { "scene": 1, "text": "текст сцены", "duration": "3 сек" }
  ],
  "voiceover": "текст для голоса",
  "screen_text": "текст на экране"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const raw = (message.content[0] as { text: string }).text;
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
