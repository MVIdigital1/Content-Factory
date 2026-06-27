import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status, result_url } = body;

  const rows = await query(
    `UPDATE infographics SET
      status = COALESCE($1, status),
      result_url = COALESCE($2, result_url),
      updated_at = NOW()
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [status || null, result_url || null, id, user.id]
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
