import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberRows = await query<{ room_id: string }>(
    "SELECT room_id FROM chat_room_members WHERE user_id = $1",
    [user.id]
  );
  if (!memberRows.length) return NextResponse.json([]);

  const ids = memberRows.map((r) => r.room_id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const rooms = await query(
    `SELECT * FROM chat_rooms WHERE id IN (${placeholders}) ORDER BY created_at ASC`,
    ids
  );
  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, project_id, workspace_id } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const room = await queryOne<{ id: string; name: string }>(
    `INSERT INTO chat_rooms (name, type, project_id, workspace_id, created_by)
     VALUES ($1, 'group', $2, $3, $4) RETURNING *`,
    [name.trim(), project_id || null, workspace_id || null, user.id]
  );
  if (!room) return NextResponse.json({ error: "Failed to create room" }, { status: 500 });

  await query(
    "INSERT INTO chat_room_members (room_id, user_id, role) VALUES ($1, $2, 'admin')",
    [room.id, user.id]
  );
  await query(
    "INSERT INTO chat_messages (room_id, user_id, type, content) VALUES ($1, $2, 'system', $3)",
    [room.id, user.id, `Группа «${room.name}» создана`]
  );

  return NextResponse.json(room, { status: 201 });
}
