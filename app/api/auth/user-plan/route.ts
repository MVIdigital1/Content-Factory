import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await queryOne<{ plan: string; plan_expires_at: string | null }>(
    "SELECT plan, plan_expires_at FROM profiles WHERE id = $1",
    [user.id]
  );
  return NextResponse.json({ plan: profile?.plan || "free", plan_expires_at: profile?.plan_expires_at || null });
}
