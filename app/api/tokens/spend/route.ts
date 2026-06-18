import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, description, meta } = await request.json();
  const amount = TOKEN_COSTS[action];
  if (!amount) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  // Get current balance
  const { data: balance } = await supabase
    .from("user_tokens")
    .select("tokens_total, tokens_used")
    .eq("user_id", user.id)
    .single();

  if (!balance) return NextResponse.json({ error: "No token record" }, { status: 404 });

  const remaining = balance.tokens_total - balance.tokens_used;
  if (remaining < amount) {
    return NextResponse.json(
      { error: "insufficient_tokens", remaining, required: amount },
      { status: 402 }
    );
  }

  // Deduct tokens
  await supabase
    .from("user_tokens")
    .update({ tokens_used: balance.tokens_used + amount })
    .eq("user_id", user.id);

  // Log transaction
  await supabase.from("token_transactions").insert({
    user_id: user.id,
    action,
    amount: -amount,
    description: description ?? action,
    meta: meta ?? {},
  });

  return NextResponse.json({
    success: true,
    spent: amount,
    tokens_remaining: remaining - amount,
  });
}
