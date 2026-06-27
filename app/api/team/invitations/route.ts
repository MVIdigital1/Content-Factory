import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await queryOne<{ id: string }>("SELECT id FROM workspaces WHERE owner_id = $1", [user.id]);
  if (!ws) return NextResponse.json([]);

  const invitations = await query(
    "SELECT * FROM workspace_invitations WHERE workspace_id = $1 ORDER BY created_at DESC",
    [ws.id]
  );
  return NextResponse.json(invitations);
}
