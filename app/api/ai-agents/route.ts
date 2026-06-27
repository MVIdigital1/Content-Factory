import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");

  let sql = "SELECT * FROM ai_agents WHERE user_id = $1";
  const params: any[] = [user.id];
  if (projectId) { sql += " AND project_id = $2"; params.push(projectId); }
  sql += " ORDER BY created_at DESC";

  const agents = await query(sql, params);
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, project_id, config = {} } = await request.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const agents = await query(
    "INSERT INTO ai_agents (user_id, project_id, name, type, is_active, config) VALUES ($1, $2, $3, $4, true, $5) RETURNING *",
    [user.id, project_id || null, name, type || null, JSON.stringify(config)]
  );
  return NextResponse.json(agents[0]);
}
