import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  let sql = "SELECT * FROM tasks WHERE user_id = $1";
  const vals: any[] = [user.id];

  if (projectId) { vals.push(projectId); sql += ` AND project_id = $${vals.length}`; }
  if (start) { vals.push(start); sql += ` AND due_date >= $${vals.length}`; }
  if (end) { vals.push(end + "T23:59:59"); sql += ` AND due_date <= $${vals.length}`; }
  sql += " ORDER BY created_at DESC";

  const tasks = await query(sql, vals);
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, status, priority, project_id, due_date } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const task = await queryOne(
    `INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [user.id, project_id || null, title.trim(), description || null, status || "todo", priority || "medium", due_date || null]
  );
  return NextResponse.json(task, { status: 201 });
}
