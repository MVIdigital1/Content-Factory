import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await request.json();

  const project = await queryOne<any>(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, user.id]
  );
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const month = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const prompt = `Ты AI Trend Analyst. Анализируй тренды для бренда.

НИША: ${project.niche || "общий бизнес"}
АУДИТОРИЯ: ${project.audience || "широкая"}
ЯЗЫК КОНТЕНТА: ${project.language}
ПЕРИОД: ${month}

Выдай анализ трендов в этой нише прямо сейчас. Что популярно, что набирает рост, что уходит.

Ответь ТОЛЬКО JSON:
{
  "trending_now": [
    { "trend": "название тренда", "description": "описание", "potential": "high|medium|low", "content_idea": "идея поста" }
  ],
  "rising": [
    { "trend": "растущий тренд", "description": "почему растёт", "action": "что сделать" }
  ],
  "avoid": [
    { "trend": "устаревший тренд", "reason": "почему избегать" }
  ],
  "best_formats": ["формат1", "формат2", "формат3"],
  "hashtag_groups": [
    { "group": "название группы", "tags": ["хэштег1", "хэштег2", "хэштег3"] }
  ],
  "insight": "главный инсайт месяца"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { text: string }).text;
  const clean = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const analysis = JSON.parse(clean);

  return NextResponse.json({ analysis });
}
