import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let { data } = await supabase
    .from("user_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Auto-create if missing
  if (!data) {
    const { data: created } = await supabase
      .from("user_tokens")
      .insert({
        user_id: user.id,
        plan: "free",
        tokens_total: 200,
        tokens_used: 0,
        reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    data = created;
  }

  // Auto-reset if reset_at passed
  if (data && new Date(data.reset_at) < new Date()) {
    const { data: reset } = await supabase
      .from("user_tokens")
      .update({
        tokens_used: 0,
        reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();
    data = reset;
  }

  const remaining = (data?.tokens_total ?? 200) - (data?.tokens_used ?? 0);
  return NextResponse.json({ ...data, tokens_remaining: Math.max(0, remaining) });
}
