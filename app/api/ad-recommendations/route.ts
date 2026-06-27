import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    "SELECT * FROM ad_recommendations WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json(rows);
}
