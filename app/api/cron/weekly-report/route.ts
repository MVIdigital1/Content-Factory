import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  // Защита cron endpoint
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twoWeeksAgo = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Получить всех пользователей с telegram_chat_id
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id")
    .not("telegram_chat_id", "is", null);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  for (const profile of profiles) {
    try {
      // Статистика за эту неделю
      const [
        { count: genThisWeek },
        { count: pubThisWeek },
        { count: genLastWeek },
        { count: pubLastWeek },
        { count: projectsCount },
      ] = await Promise.all([
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("projects.user_id", profile.id)
          .gte("created_at", oneWeekAgo),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("status", "published")
          .gte("created_at", oneWeekAgo),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", oneWeekAgo),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("status", "published")
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", oneWeekAgo),
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
      const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);
      const genArrow = genDelta >= 0 ? "↑" : "↓";
      const pubArrow = pubDelta >= 0 ? "↑" : "↓";

      const weekStart = new Date(oneWeekAgo).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });
      const weekEnd = now.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });

      const report = `📊 *Еженедельный отчёт MVI*
${weekStart} — ${weekEnd}

📁 Проектов: *${projectsCount ?? 0}*
✍️ Генераций: *${genThisWeek ?? 0}* ${genArrow} ${Math.abs(genDelta)} vs прошлая неделя
🚀 Опубликовано: *${pubThisWeek ?? 0}* ${pubArrow} ${Math.abs(pubDelta)} vs прошлая неделя

${(pubThisWeek ?? 0) === 0 ? "💡 _На этой неделе не было публикаций. Самое время создать контент!_" : `🎯 _Отличная работа! Продолжай в том же духе._`}`;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: profile.telegram_chat_id,
          text: report,
          parse_mode: "Markdown",
        }),
      });

      sent++;
    } catch {
      // Продолжаем для других пользователей
    }
  }

  return NextResponse.json({ ok: true, sent });
}
