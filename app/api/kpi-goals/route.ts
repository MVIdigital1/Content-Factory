import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await query(
    "SELECT * FROM kpi_goals WHERE user_id = $1 ORDER BY created_at",
    [user.id]
  );
  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { metric, target, project_id } = await request.json();
  const goal = await queryOne(
    "INSERT INTO kpi_goals (user_id, metric, target, project_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [user.id, metric, target, project_id || null]
  );
  return NextResponse.json(goal, { status: 201 });
}
