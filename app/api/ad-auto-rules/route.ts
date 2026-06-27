import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  let sql = "SELECT * FROM ad_auto_rules WHERE user_id = $1";
  const vals: any[] = [user.id];
  if (projectId) { vals.push(projectId); sql += ` AND project_id = $${vals.length}`; }
  sql += " ORDER BY created_at";
  return NextResponse.json(await query(sql, vals));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { project_id, campaign_id, name, condition_metric, condition_op, condition_value, action_type, action_value, is_active } = body;
  const row = await queryOne(
    `INSERT INTO ad_auto_rules (user_id, project_id, campaign_id, name, condition_metric, condition_op, condition_value, action_type, action_value, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [user.id, project_id||null, campaign_id||null, name, condition_metric, condition_op, condition_value, action_type, action_value||null, is_active ?? true]
  );
  return NextResponse.json(row, { status: 201 });
}
