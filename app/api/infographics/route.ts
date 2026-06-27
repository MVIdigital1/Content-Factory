import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    "SELECT * FROM infographics WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, source_url, prompt, status } = await request.json();

  const row = await queryOne(
    `INSERT INTO infographics (user_id, project_id, source_url, prompt, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user.id, project_id || null, source_url, prompt || null, status || "processing"]
  );
  return NextResponse.json(row, { status: 201 });
}
