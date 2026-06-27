import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;
  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  let sql = `
    SELECT m.*, u.email as user_email,
           r.content as reply_content, r.user_id as reply_user_id,
           (SELECT email FROM auth_users WHERE id = r.user_id) as reply_user_email,
           r.file_url as reply_file_url
    FROM chat_messages m
    LEFT JOIN auth_users u ON m.user_id = u.id
    LEFT JOIN chat_messages r ON m.reply_to = r.id
    WHERE m.room_id = $1`;
  const vals: any[] = [roomId];

  if (since) { vals.push(since); sql += ` AND m.created_at > $${vals.length}`; }
  sql += " ORDER BY m.created_at ASC LIMIT 100";

  const messages = await query(sql, vals);

  // Load reactions
  if (messages.length) {
    const ids = messages.map((m: any) => m.id);
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(",");
    const reactions = await query(
      `SELECT * FROM message_reactions WHERE message_id IN (${placeholders})`,
      ids
    );

    const reactMap: Record<string, any[]> = {};
    reactions.forEach((r: any) => {
      if (!reactMap[r.message_id]) reactMap[r.message_id] = [];
      const ex = reactMap[r.message_id].find((x: any) => x.emoji === r.emoji);
      if (ex) { ex.count++; if (r.user_id === user.id) ex.mine = true; }
      else reactMap[r.message_id].push({ emoji: r.emoji, count: 1, mine: r.user_id === user.id });
    });

    return NextResponse.json(
      messages.map((m: any) => ({
        ...m,
        reply: m.reply_content ? {
          content: m.reply_content,
          user_email: m.reply_user_email,
          file_url: m.reply_file_url,
        } : null,
        reactions: reactMap[m.id] || [],
      }))
    );
  }

  return NextResponse.json([]);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;
  const { content, type = "text", reply_to, file_url, file_type, file_name } = await request.json();

  const rows = await query(
    `INSERT INTO chat_messages (room_id, user_id, content, type, reply_to, file_url, file_type, file_name, user_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
       (SELECT email FROM auth_users WHERE id = $2))
     RETURNING *`,
    [roomId, user.id, content || "", type, reply_to || null, file_url || null, file_type || null, file_name || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
