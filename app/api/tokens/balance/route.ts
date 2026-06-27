import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let data = await queryOne(
    "SELECT * FROM user_tokens WHERE user_id = $1",
    [user.id]
  );

  if (!data) {
    const rows = await query(
      `INSERT INTO user_tokens (user_id, plan, tokens_total, tokens_used)
       VALUES ($1, 'free', 10000, 0) ON CONFLICT (user_id) DO NOTHING RETURNING *`,
      [user.id]
    );
    data = rows[0] ?? { plan: "free", tokens_total: 10000, tokens_used: 0 };
  }

  const remaining = (data?.tokens_total ?? 10000) - (data?.tokens_used ?? 0);
  return NextResponse.json({ ...data, tokens_remaining: Math.max(0, remaining) });
}
