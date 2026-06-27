import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;
  const members = await query(
    `SELECT crm.*, u.email FROM chat_room_members crm
     LEFT JOIN auth_users u ON crm.user_id = u.id
     WHERE crm.room_id = $1`,
    [roomId]
  );
  return NextResponse.json(members);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;
  const { last_read } = await request.json();

  await query(
    "UPDATE chat_room_members SET last_read = $1 WHERE room_id = $2 AND user_id = $3",
    [last_read || new Date().toISOString(), roomId, user.id]
  );
  return NextResponse.json({ ok: true });
}
