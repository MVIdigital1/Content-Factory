import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tests = await query("SELECT * FROM ab_tests WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
  return NextResponse.json(tests);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, project_id, variant_a, variant_b } = await request.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const tests = await query(
    "INSERT INTO ab_tests (user_id, project_id, name, variant_a, variant_b, status) VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *",
    [user.id, project_id || null, name, JSON.stringify(variant_a || {}), JSON.stringify(variant_b || {})]
  );
  return NextResponse.json(tests[0]);
}
