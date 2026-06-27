import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  const row = await queryOne(
    "UPDATE ad_recommendations SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
    [status, id, user.id]
  );
  return NextResponse.json(row);
}
