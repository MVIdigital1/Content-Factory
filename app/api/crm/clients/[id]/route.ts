import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, name, company, email, phone, notes } = await request.json();
  const updates: string[] = [];
  const vals: any[] = [];
  let i = 1;

  if (status !== undefined) { updates.push(`status = $${i++}`); vals.push(status); }
  if (name !== undefined) { updates.push(`name = $${i++}`); vals.push(name); }
  if (company !== undefined) { updates.push(`company = $${i++}`); vals.push(company); }
  if (email !== undefined) { updates.push(`email = $${i++}`); vals.push(email); }
  if (phone !== undefined) { updates.push(`phone = $${i++}`); vals.push(phone); }
  if (notes !== undefined) { updates.push(`notes = $${i++}`); vals.push(notes); }

  if (!updates.length) return NextResponse.json({ error: "Nothing to update" });
  vals.push(id, user.id);
  await query(`UPDATE crm_clients SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${i++} AND user_id = $${i}`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query("DELETE FROM crm_clients WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
