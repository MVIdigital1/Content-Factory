import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, niche, keywords } = await request.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const prompt = `Ты маркетолог. На основе названия и ниши бизнеса напиши краткое описание бренда, целевую аудиторию и ключевые слова.

Название: ${name}
Ниша: ${niche || "не указана"}
Ключевые слова (если уже есть): ${keywords || "нет"}

Верни ТОЛЬКО JSON без markdown:
{
  "description": "2-3 предложения о бренде: чем занимается, что предлагает, ценности (до 200 символов)",
  "audience": "целевая аудитория: возраст, интересы, боли, география (до 150 символов)",
  "keywords": "7-10 ключевых слов через запятую для SEO и рекламы"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { text: string }).text;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
