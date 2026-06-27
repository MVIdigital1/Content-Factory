import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "200"), 500);

  let sql = `SELECT c.*, p.name as project_name
             FROM contents c
             LEFT JOIN projects p ON c.project_id = p.id
             WHERE c.user_id = $1`;
  const vals: any[] = [user.id];

  if (projectId) { vals.push(projectId); sql += ` AND c.project_id = $${vals.length}`; }
  if (status) { vals.push(status); sql += ` AND c.status = $${vals.length}`; }

  vals.push(limit);
  sql += ` ORDER BY c.created_at DESC LIMIT $${vals.length}`;

  const contents = await query(sql, vals);
  return NextResponse.json(contents);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { project_id, campaign_id, type, platform, goal, title, idea, hook, script, voiceover, screen_text, caption, hashtags, cta, source_image_url, status } = body;

  const content = await queryOne(
    `INSERT INTO contents (user_id, project_id, campaign_id, type, platform, goal, title, idea, hook, script, voiceover, screen_text, caption, hashtags, cta, source_image_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
    [user.id, project_id || null, campaign_id || null, type || null, platform || null, goal || null, title || null, idea || null, hook || null, JSON.stringify(script || []), voiceover || null, screen_text || null, caption || null, hashtags || [], cta || null, source_image_url || null, status || "draft"]
  );
  return NextResponse.json(content, { status: 201 });
}
