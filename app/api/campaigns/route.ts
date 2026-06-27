import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const projectId = url.searchParams.get("project_id");

  let sql = "SELECT * FROM ad_campaigns WHERE user_id = $1";
  const vals: any[] = [user.id];

  if (projectId) { vals.push(projectId); sql += ` AND project_id = $${vals.length}`; }
  if (start) { vals.push(start); sql += ` AND created_at >= $${vals.length}`; }
  if (end) { vals.push(end + "T23:59:59"); sql += ` AND created_at <= $${vals.length}`; }
  sql += " ORDER BY created_at DESC";

  const campaigns = await query(sql, vals);
  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, project_id, platforms, budget, status } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const campaign = await queryOne(
    `INSERT INTO ad_campaigns (user_id, project_id, name, platforms, budget, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [user.id, project_id || null, name.trim(), platforms || [], budget || 0, status || "draft"]
  );
  return NextResponse.json(campaign, { status: 201 });
}
