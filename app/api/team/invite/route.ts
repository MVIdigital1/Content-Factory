import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/mailer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role, workspace_id } = await req.json();
  if (!email) return NextResponse.json({ error: "Email обязателен" }, { status: 400 });

  const workspace = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM workspaces WHERE owner_id = $1 LIMIT 1",
    [user.id]
  );
  const wid = workspace_id || workspace?.id;
  if (!wid) return NextResponse.json({ error: "Воркспейс не найден" }, { status: 404 });

  const inviter = await queryOne<{ full_name: string; email: string }>(
    "SELECT full_name, email FROM users WHERE id = $1",
    [user.id]
  );

  const existingUser = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);

  if (existingUser) {
    const existing = await queryOne(
      "SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [wid, existingUser.id]
    );
    if (!existing) {
      await query(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, invited_by, status) VALUES ($1, $2, $3, $4, $5, 'active') ON CONFLICT (workspace_id, user_id) DO NOTHING",
        [wid, existingUser.id, email, role ?? "viewer", user.id]
      );
    }
  } else {
    await query(
      "INSERT INTO workspace_members (workspace_id, email, role, invited_by, status) VALUES ($1, $2, $3, $4, 'pending') ON CONFLICT DO NOTHING",
      [wid, email, role ?? "viewer", user.id]
    );
  }

  await sendInvitationEmail(
    email,
    workspace?.name ?? "mvira",
    inviter?.full_name || inviter?.email || "Команда mvira",
    role ?? "viewer",
    !!existingUser
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
