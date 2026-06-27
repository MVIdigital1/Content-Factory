import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export const TOKEN_COSTS: Record<string, number> = {
  ai_chat: 5,
  ai_description: 5,
  creative_gen: 10,
  campaign_ai: 20,
  content_plan: 30,
  infographic_gen: 50,
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, description, meta } = await request.json();
  const amount = TOKEN_COSTS[action];
  if (!amount) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const balance = await queryOne<{ tokens_total: number; tokens_used: number }>(
    "SELECT tokens_total, tokens_used FROM user_tokens WHERE user_id = $1",
    [user.id]
  );

  if (!balance) return NextResponse.json({ error: "No token record" }, { status: 404 });

  const remaining = balance.tokens_total - balance.tokens_used;
  if (remaining < amount) {
    return NextResponse.json(
      { error: "insufficient_tokens", remaining, required: amount },
      { status: 402 }
    );
  }

  await query(
    "UPDATE user_tokens SET tokens_used = tokens_used + $1, updated_at = NOW() WHERE user_id = $2",
    [amount, user.id]
  );

  await query(
    "INSERT INTO token_transactions (user_id, action, amount, description, meta) VALUES ($1, $2, $3, $4, $5)",
    [user.id, action, -amount, description ?? action, JSON.stringify(meta ?? {})]
  );

  return NextResponse.json({
    success: true,
    spent: amount,
    tokens_remaining: remaining - amount,
  });
}
