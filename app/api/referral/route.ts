import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mvira.uz";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let referral = await queryOne<{ code: string; reward_tokens: number }>(
    "SELECT code, reward_tokens FROM referrals WHERE user_id = $1 LIMIT 1",
    [user.id]
  );

  if (!referral) {
    const code = user.id.slice(0, 8).toUpperCase();
    await query(
      "INSERT INTO referrals (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [user.id, code]
    );
    referral = { code, reward_tokens: 0 };
  }

  const referred = await query(
    "SELECT id, referred_user_id, status, created_at FROM referrals WHERE user_id = $1 AND referred_user_id IS NOT NULL",
    [user.id]
  );

  return NextResponse.json({
    code: referral.code,
    url: `${APP_URL}/ru/auth/register?ref=${referral.code}`,
    referrals: referred,
    earned_months: 0,
  });
}
