import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, winner } = await request.json();
  const updates: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (status !== undefined) { updates.push(`status = $${i++}`); vals.push(status); }
  if (winner !== undefined) { updates.push(`winner = $${i++}`); vals.push(winner); }
  if (!updates.length) return NextResponse.json({ ok: true });
  vals.push(id, user.id);
  await query(`UPDATE ab_tests SET ${updates.join(", ")} WHERE id = $${i++} AND user_id = $${i}`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query("DELETE FROM ab_tests WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
