import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await query(
    "SELECT * FROM projects WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, niche, description, audience, tone, language, logo_url, country, phone, website } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const project = await queryOne(
    `INSERT INTO projects (user_id, name, niche, description, audience, tone, language, logo_url, country, phone, website, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true) RETURNING *`,
    [user.id, name.trim(), niche || null, description || null, audience || null, tone || "friendly", language || "ru", logo_url || null, country || null, phone || null, website || null]
  );
  return NextResponse.json(project, { status: 201 });
}
