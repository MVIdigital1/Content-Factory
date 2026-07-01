import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const rows = await query(
    `SELECT id, title, slug, created_at
     FROM landings
     WHERE user_id = $1 AND published = true
     ORDER BY created_at DESC`,
    [userId]
  );
  return NextResponse.json(rows);
}
