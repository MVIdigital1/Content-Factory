import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await queryOne<{ storage_key: string | null }>(
    "SELECT storage_key FROM project_files WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.storage_key?.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", row.storage_key));
    } catch { /* ignore if already deleted */ }
  }

  await query("DELETE FROM project_files WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
