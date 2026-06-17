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

  const { projectId } = await request.json();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: recentContents } = await supabase
    .from("contents")
    .select("title, platform, status, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: publishedCount } = await supabase
    .from("contents")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "published");

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const prompt = `Ты AI SMM Manager для бренда.

БРЕНД: ${project.name}
НИША: ${project.niche || "не указана"}
АУДИТОРИЯ: ${project.audience || "не указана"}
ТОН: ${project.tone}
ЯЗЫК: ${project.language}
ОПУБЛИКОВАНО ПОСТОВ: ${publishedCount ?? 0}
ПОСЛЕДНИЕ ТЕМЫ: ${
    recentContents
      ?.map((c) => c.title)
      .filter(Boolean)
      .join(", ") || "нет"
  }
СЕГОДНЯ: ${today}

Составь контент-план на 7 дней. Для каждого дня предложи:
- Тему поста
- Тип контента (пост/reels/stories)
- Лучшее время публикации
- Платформу

Ответь ТОЛЬКО JSON:
{
  "week_theme": "главная тема недели",
  "days": [
    {
      "day": "Понедельник",
      "date": "дата",
      "topic": "тема поста",
      "type": "post|reels|stories",
      "platform": "telegram|instagram",
      "best_time": "10:00",
      "goal": "вовлечённость|охват|продажи",
      "tip": "краткий совет"
    }
  ],
  "summary": "краткое резюме стратегии"
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
  const plan = JSON.parse(clean);

  return NextResponse.json({ plan });
}
