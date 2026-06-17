import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Получить данные для инсайта
  const [{ data: projects }, { data: recentContents }] = await Promise.all([
    supabase
      .from("projects")
      .select("name, niche, tone")
      .eq("is_active", true)
      .limit(3),
    supabase
      .from("contents")
      .select("title, platform, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!projects || projects.length === 0) {
    return NextResponse.json({
      insight: "Создайте первый проект чтобы получать персональные советы 🚀",
    });
  }

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const lastPostDays = recentContents?.[0]
    ? Math.floor(
        (Date.now() - new Date(recentContents[0].created_at).getTime()) /
          86400000,
      )
    : null;

  const prompt = `Ты SMM-советник. Дай ОДИН конкретный совет что создать сегодня.
Сегодня: ${today}
Проекты: ${projects.map((p) => `${p.name} (${p.niche || "без ниши"})`).join(", ")}
Последний пост: ${lastPostDays !== null ? `${lastPostDays} дн. назад` : "нет постов"}
Последние темы: ${
    recentContents
      ?.slice(0, 3)
      .map((c) => c.title)
      .join(", ") || "—"
  }

Ответь одним предложением (не более 15 слов), конкретно и по делу. Без приветствий.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const insight = (message.content[0] as { text: string }).text.trim();
  return NextResponse.json({ insight });
}
