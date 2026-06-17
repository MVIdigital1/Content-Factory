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

  const {
    projectId,
    topic,
    duration = 30,
    platform = "instagram",
  } = await request.json();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = `Ты AI Script Writer. Пишешь сценарии для коротких видео.

БРЕНД: ${project.name}
НИША: ${project.niche || "общий бизнес"}
АУДИТОРИЯ: ${project.audience || "широкая"}
ТОН: ${project.tone}
ПЛАТФОРМА: ${platform} (Reels/TikTok)
ТЕМА: ${topic}
ДЛИТЕЛЬНОСТЬ: ${duration} секунд

Напиши готовый сценарий для видео.

Ответь ТОЛЬКО JSON:
{
  "title": "заголовок видео",
  "hook": "первые 3 секунды — самое важное",
  "scenes": [
    {
      "seconds": "0-5",
      "visual": "что показывать на экране",
      "voiceover": "текст за кадром",
      "text_on_screen": "текст на экране (если нужен)",
      "action": "что делать"
    }
  ],
  "cta": "призыв к действию в конце",
  "caption": "подпись к видео",
  "hashtags": ["хэштег1", "хэштег2", "хэштег3"],
  "filming_tips": ["совет по съёмке1", "совет2"],
  "estimated_duration": ${duration}
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { text: string }).text;
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const script = JSON.parse(clean);

  return NextResponse.json({ script });
}
