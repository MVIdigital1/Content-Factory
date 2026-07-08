import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const landings = await query(
    "SELECT id, title, slug, published, content, content->>'template_id' AS template_id, content->'settings'->>'logoUrl' AS logo_url, created_at, updated_at FROM landings WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json(landings);
}
