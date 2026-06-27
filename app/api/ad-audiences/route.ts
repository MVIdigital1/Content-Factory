import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  let sql = "SELECT * FROM ad_audiences WHERE user_id = $1";
  const vals: any[] = [user.id];
  if (projectId) { vals.push(projectId); sql += ` AND project_id = $${vals.length}`; }
  sql += " ORDER BY created_at";
  return NextResponse.json(await query(sql, vals));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const row = await queryOne(
    `INSERT INTO ad_audiences (user_id, project_id, name, description, size, platforms, targeting)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [user.id, body.project_id||null, body.name, body.description||null, body.size||null, JSON.stringify(body.platforms||[]), JSON.stringify(body.targeting||{})]
  );
  return NextResponse.json(row, { status: 201 });
}
