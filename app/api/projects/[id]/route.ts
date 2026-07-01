import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await queryOne(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json();
  const { name, niche, description, audience, tone, language, logo_url, is_active, country, phone, website, keywords } = body;

  const project = await queryOne(
    `UPDATE projects SET
      name = COALESCE($1, name),
      niche = COALESCE($2, niche),
      description = COALESCE($3, description),
      audience = COALESCE($4, audience),
      tone = COALESCE($5, tone),
      language = COALESCE($6, language),
      logo_url = COALESCE($7, logo_url),
      is_active = COALESCE($8, is_active),
      country = COALESCE($9, country),
      phone = COALESCE($10, phone),
      website = COALESCE($11, website),
      keywords = COALESCE($12, keywords),
      updated_at = NOW()
     WHERE id = $13 AND user_id = $14 RETURNING *`,
    [name || null, niche || null, description || null, audience || null, tone || null, language || null, logo_url || null, is_active ?? null, country || null, phone || null, website || null, keywords || null, id, user.id]
  );
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await query(
    "UPDATE projects SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  return NextResponse.json({ ok: true });
}
