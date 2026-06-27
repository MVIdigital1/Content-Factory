import { query } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const profiles = await query<{ id: string; telegram_chat_id: string }>(
    "SELECT id, telegram_chat_id FROM profiles WHERE telegram_chat_id IS NOT NULL"
  );

  if (!profiles.length) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;
  for (const profile of profiles) {
    try {
      const [genThisWeek, pubThisWeek, genLastWeek, pubLastWeek, projectsCount] = await Promise.all([
        query<{ count: string }>("SELECT COUNT(*) FROM contents c JOIN projects p ON c.project_id = p.id WHERE p.user_id = $1 AND c.created_at >= $2", [profile.id, oneWeekAgo]),
        query<{ count: string }>("SELECT COUNT(*) FROM contents c JOIN projects p ON c.project_id = p.id WHERE p.user_id = $1 AND c.status = 'published' AND c.created_at >= $2", [profile.id, oneWeekAgo]),
        query<{ count: string }>("SELECT COUNT(*) FROM contents c JOIN projects p ON c.project_id = p.id WHERE p.user_id = $1 AND c.created_at >= $2 AND c.created_at < $3", [profile.id, twoWeeksAgo, oneWeekAgo]),
        query<{ count: string }>("SELECT COUNT(*) FROM contents c JOIN projects p ON c.project_id = p.id WHERE p.user_id = $1 AND c.status = 'published' AND c.created_at >= $2 AND c.created_at < $3", [profile.id, twoWeeksAgo, oneWeekAgo]),
        query<{ count: string }>("SELECT COUNT(*) FROM projects WHERE user_id = $1 AND is_active = true", [profile.id]),
      ]);

      const gTW = Number(genThisWeek[0]?.count || 0);
      const pTW = Number(pubThisWeek[0]?.count || 0);
      const gLW = Number(genLastWeek[0]?.count || 0);
      const pLW = Number(pubLastWeek[0]?.count || 0);
      const proj = Number(projectsCount[0]?.count || 0);

      const genDelta = gTW - gLW;
      const pubDelta = pTW - pLW;

      const weekStart = new Date(oneWeekAgo).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      const weekEnd = now.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

      const report = `📊 *Еженедельный отчёт MVI*\n${weekStart} — ${weekEnd}\n\n📁 Проектов: *${proj}*\n✍️ Генераций: *${gTW}* ${genDelta >= 0 ? "↑" : "↓"} ${Math.abs(genDelta)} vs прошлая неделя\n🚀 Опубликовано: *${pTW}* ${pubDelta >= 0 ? "↑" : "↓"} ${Math.abs(pubDelta)} vs прошлая неделя\n\n${pTW === 0 ? "💡 _На этой неделе не было публикаций. Самое время создать контент!_" : "🎯 _Отличная работа! Продолжай в том же духе._"}`;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: profile.telegram_chat_id, text: report, parse_mode: "Markdown" }),
      });
      sent++;
    } catch {}
  }

  return NextResponse.json({ ok: true, sent });
}
