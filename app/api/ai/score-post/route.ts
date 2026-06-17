import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();

  const { data: content } = await supabase
    .from("contents")
    .select("*, projects!inner(name, niche, tone, user_id)")
    .eq("id", contentId)
    .eq("projects.user_id", user.id)
    .single();

  if (!content)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = content.projects as any;

  const prompt = `Оцени этот пост для Instagram/Telegram от 0 до 100 по четырём критериям.

БРЕНД: ${project.name}, Ниша: ${project.niche}, Тон: ${project.tone}

ПОСТ:
Хук: ${content.hook || "—"}
Текст: ${content.caption || "—"}
CTA: ${content.cta || "—"}
Хэштеги: ${(content.hashtags || []).join(", ")}

Ответь ТОЛЬКО JSON:
{
  "virality": число от 0 до 100,
  "tone_match": число от 0 до 100,
  "brand_match": число от 0 до 100,
  "overall": число от 0 до 100,
  "tip": "одна конкретная рекомендация как улучшить пост"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { text: string }).text;
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const score = JSON.parse(clean);

  // Сохранить в БД
  await supabase
    .from("contents")
    .update({ ai_score: score })
    .eq("id", contentId);

  return NextResponse.json({ score });
}
