import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const allowed = ["name", "is_active", "condition_metric", "condition_op", "condition_value", "action_type", "action_value"];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (key in body) { vals.push(body[key]); sets.push(`${key} = $${vals.length}`); }
  }
  if (!sets.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  vals.push(id, user.id);
  const row = await queryOne(
    `UPDATE ad_auto_rules SET ${sets.join(", ")} WHERE id = $${vals.length - 1} AND user_id = $${vals.length} RETURNING *`,
    vals
  );
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await query("DELETE FROM ad_auto_rules WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
