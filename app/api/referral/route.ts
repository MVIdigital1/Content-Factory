import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://content-factory-khaki.vercel.app";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Получить или создать реферальный код
  let { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, earned_months")
    .eq("id", user.id)
    .single();

  if (!profile?.referral_code) {
    const code = user.id.slice(0, 8).toUpperCase();
    await supabase
      .from("profiles")
      .upsert({ id: user.id, referral_code: code })
      .eq("id", user.id);
    profile = { referral_code: code, earned_months: 0 };
  }

  // Получить рефералов
  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, email, converted, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    code: profile.referral_code,
    url: `${APP_URL}/ru/auth/register?ref=${profile.referral_code}`,
    referrals: referrals || [],
    earned_months: profile.earned_months || 0,
  });
}
