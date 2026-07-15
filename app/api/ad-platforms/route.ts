import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  let sql = "SELECT id, platform_key, name, color, abbr, account_id, label, is_active, status, monthly_spend, updated_at FROM ad_platforms WHERE user_id = $1";
  const vals: any[] = [user.id];
  if (projectId) { vals.push(projectId); sql += ` AND project_id = $${vals.length}`; }
  sql += " ORDER BY created_at";
  return NextResponse.json(await query(sql, vals));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { platform_key, name, color, abbr, ad_account_id, project_id, token } = body;
  const row = await queryOne(
    `INSERT INTO ad_platforms (user_id, project_id, platform_key, name, color, abbr, account_id, token, is_active, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,'connected')
     RETURNING *`,
    [user.id, project_id||null, platform_key, name||platform_key, color||'#888', abbr||platform_key.slice(0,2).toUpperCase(), ad_account_id||null, token||null]
  );
  return NextResponse.json(row, { status: 201 });
}
