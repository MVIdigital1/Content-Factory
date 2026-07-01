import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function toSlug(name: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",
    й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",
    у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",
    э:"e",ю:"yu",я:"ya",
  };
  const transliterated = name.toLowerCase().split("").map((c) => map[c] ?? c).join("");
  const base = transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const uid = Math.random().toString(36).slice(2, 8);
  return `${base}-${uid}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { businessName, niche, city, offer, audience, pain, advantages, tone, brandColor, templateId, bgImage } = body;

    if (!businessName || !offer || !audience) {
      return NextResponse.json({ error: "Заполните обязательные поля" }, { status: 400 });
    }

    const prompt = `Создай лендинг для бизнеса на русском языке.

Данные бизнеса:
- Название: ${businessName}
- Ниша: ${niche}
- Город: ${city || "не указан"}
- Оффер: ${offer}
- Аудитория: ${audience}
- Боль клиента: ${pain || "не указана"}
- Преимущества: ${advantages || "не указаны"}
- Тон: ${tone}

Верни ТОЛЬКО JSON без markdown, без комментариев, без блока \`\`\`:
{
  "title": "краткий SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "eyebrow": "короткая фраза над заголовком (5-7 слов)",
      "headline": "главный заголовок (сильный, до 10 слов)",
      "subheadline": "подзаголовок с деталями оффера (1-2 предложения)",
      "cta": "текст кнопки (глагол + выгода, 3-5 слов)"
    },
    {
      "type": "features",
      "title": "заголовок секции преимуществ",
      "items": [
        {"icon": "⚡", "title": "преимущество 1", "desc": "описание 1-2 предложения"},
        {"icon": "✅", "title": "преимущество 2", "desc": "описание 1-2 предложения"},
        {"icon": "🏆", "title": "преимущество 3", "desc": "описание 1-2 предложения"}
      ]
    },
    {
      "type": "form",
      "title": "заголовок формы (призыв к действию)",
      "subtitle": "короткая мотивация заполнить форму",
      "button": "текст кнопки отправки"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const slug = toSlug(businessName);

    const landing = await queryOne<{ id: string }>(
      `INSERT INTO landings (user_id, title, slug, content, published)
       VALUES ($1, $2, $3, $4, false) RETURNING id`,
      [user.id, parsed.title || businessName, slug, JSON.stringify({ blocks: parsed.blocks || [], template_id: templateId || "classic", bg_image: bgImage || null, settings: { brandColor: brandColor || "#6366f1", tone } })]
    );

    return NextResponse.json({ id: landing?.id, slug });
  } catch (err: any) {
    console.error("[landings/generate]", err);
    return NextResponse.json({ error: err.message || "Внутренняя ошибка" }, { status: 500 });
  }
}
