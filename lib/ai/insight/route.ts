import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, recentContents] = await Promise.all([
    query<{ name: string; niche: string; tone: string }>(
      "SELECT name, niche, tone FROM projects WHERE user_id = $1 AND is_active = true LIMIT 3",
      [user.id]
    ),
    query<{ title: string; platform: string; created_at: string }>(
      "SELECT title, platform, created_at FROM contents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
      [user.id]
    ),
  ]);

  if (!projects.length) {
    return NextResponse.json({ insight: "Создайте первый проект чтобы получать персональные советы 🚀" });
  }

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const lastPostDays = recentContents[0]
    ? Math.floor((Date.now() - new Date(recentContents[0].created_at).getTime()) / 86400000)
    : null;

  const prompt = `Ты SMM-советник. Дай ОДИН конкретный совет что создать сегодня.
Сегодня: ${today}
Проекты: ${projects.map((p) => `${p.name} (${p.niche || "без ниши"})`).join(", ")}
Последний пост: ${lastPostDays !== null ? `${lastPostDays} дн. назад` : "нет постов"}
Последние темы: ${recentContents.slice(0, 3).map((c) => c.title).join(", ") || "—"}

Ответь одним предложением (не более 15 слов), конкретно и по делу. Без приветствий.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const insight = (message.content[0] as { text: string }).text.trim();
  return NextResponse.json({ insight });
}
