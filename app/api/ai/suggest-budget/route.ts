import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal, niche, audience, platforms, days } = await request.json();

  const prompt = `Ты специалист по рекламе в СНГ. Порекомендуй бюджет для рекламной кампании.

Цель: ${goal || "Продажи / заявки"}
Ниша: ${niche || "не указана"}
Аудитория: ${audience || "не указана"}
Платформы: ${(platforms || []).join(", ") || "не указаны"}
Период: ${days || 30} дней

Верни ТОЛЬКО JSON без markdown:
{
  "min": число (минимальный бюджет в рублях),
  "recommended": число (рекомендованный бюджет в рублях),
  "max": число (максимальный бюджет в рублях),
  "tip": "одна фраза-совет по бюджету (до 100 символов)"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { text: string }).text;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[ai/suggest-budget]", err?.message || err);
    return NextResponse.json({ error: err?.message || "Generation failed" }, { status: 500 });
  }
}
