import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oneWeekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString();

  const [
    genTotal,
    scheduled,
    published,
    genThisWeek,
    genLastWeek,
    pubThisWeek,
    pubLastWeek,
    platforms,
    upcoming,
    recent,
  ] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1", [user.id]),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'scheduled'", [user.id]),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'published'", [user.id]),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND created_at >= $2", [user.id, oneWeekAgo]),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND created_at >= $2 AND created_at < $3", [user.id, twoWeeksAgo, oneWeekAgo]),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'published' AND created_at >= $2", [user.id, oneWeekAgo]),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'published' AND created_at >= $2 AND created_at < $3", [user.id, twoWeeksAgo, oneWeekAgo]),
    query<{ platform: string }>("SELECT platform FROM contents WHERE user_id = $1", [user.id]),
    query(
      `SELECT sp.id, sp.scheduled_at, c.title, c.platform, c.type
       FROM scheduled_posts sp
       JOIN contents c ON sp.content_id = c.id
       WHERE c.user_id = $1 AND sp.status = 'pending' AND sp.scheduled_at >= NOW()
       ORDER BY sp.scheduled_at ASC LIMIT 4`,
      [user.id]
    ),
    query(
      `SELECT c.id, c.title, c.platform, c.status, c.created_at, p.name as project_name
       FROM contents c
       LEFT JOIN projects p ON c.project_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC LIMIT 4`,
      [user.id]
    ),
  ]);

  const platformCounts: Record<string, number> = {};
  platforms.forEach((c) => {
    if (c.platform) platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });

  return NextResponse.json({
    generationsCount: parseInt(genTotal?.count ?? "0"),
    scheduledCount: parseInt(scheduled?.count ?? "0"),
    publishedCount: parseInt(published?.count ?? "0"),
    genThisWeek: parseInt(genThisWeek?.count ?? "0"),
    genLastWeek: parseInt(genLastWeek?.count ?? "0"),
    pubThisWeek: parseInt(pubThisWeek?.count ?? "0"),
    pubLastWeek: parseInt(pubLastWeek?.count ?? "0"),
    platformCounts,
    upcomingPosts: upcoming,
    recentContents: recent,
  });
}
