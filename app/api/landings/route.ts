import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const landings = await query(
    "SELECT id, title, slug, published, template_id, created_at, updated_at FROM landings WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json(landings);
}
