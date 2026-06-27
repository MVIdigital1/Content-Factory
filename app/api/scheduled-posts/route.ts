import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  let sql = `SELECT sp.*, c.title, c.platform, c.type, c.caption
     FROM scheduled_posts sp
     JOIN contents c ON sp.content_id = c.id
     WHERE c.user_id = $1`;
  const vals: any[] = [user.id];

  if (status) { vals.push(status); sql += ` AND sp.status = $${vals.length}`; }
  else sql += ` AND sp.status != 'draft'`;
  if (start) { vals.push(start); sql += ` AND sp.scheduled_at >= $${vals.length}`; }
  if (end) { vals.push(end + "T23:59:59"); sql += ` AND sp.scheduled_at <= $${vals.length}`; }
  sql += " ORDER BY sp.scheduled_at ASC";

  const posts = await query(sql, vals);
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content_id, platform, scheduled_at } = await request.json();
  if (!content_id || !scheduled_at) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const [post] = await Promise.all([
    queryOne(
      "INSERT INTO scheduled_posts (content_id, platform, scheduled_at, status) VALUES ($1, $2, $3, 'pending') RETURNING *",
      [content_id, platform || null, scheduled_at]
    ),
    query("UPDATE contents SET status = 'scheduled', updated_at = NOW() WHERE id = $1 AND user_id = $2", [content_id, user.id]),
  ]);

  return NextResponse.json(post, { status: 201 });
}
