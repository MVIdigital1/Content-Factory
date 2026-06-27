import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await query(
    "SELECT * FROM token_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [user.id]
  );
  return NextResponse.json(transactions);
}
