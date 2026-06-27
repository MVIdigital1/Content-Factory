import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [weekRow, monthRow, publishedRow] = await Promise.all([
    queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND created_at >= $2",
      [user.id, weekAgo]
    ),
    queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND created_at >= $2",
      [user.id, monthAgo]
    ),
    queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'published' AND created_at >= $2",
      [user.id, weekAgo]
    ),
  ]);

  return NextResponse.json({
    posts_per_week: Number(weekRow?.count ?? 0),
    posts_per_month: Number(monthRow?.count ?? 0),
    published: Number(publishedRow?.count ?? 0),
  });
}
