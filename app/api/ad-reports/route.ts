import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  let sql = "SELECT * FROM ad_reports WHERE user_id = $1";
  const vals: any[] = [user.id];
  if (projectId) { vals.push(projectId); sql += ` AND project_id = $${vals.length}`; }
  sql += " ORDER BY created_at DESC";
  return NextResponse.json(await query(sql, vals));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const row = await queryOne(
    `INSERT INTO ad_reports (user_id, project_id, title, type, status, period_start, period_end, metrics)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [user.id, body.project_id||null, body.title, body.type||'weekly', body.status||'draft', body.period_start||null, body.period_end||null, JSON.stringify(body.metrics||{})]
  );
  return NextResponse.json(row, { status: 201 });
}
