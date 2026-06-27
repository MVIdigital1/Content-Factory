import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ago30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();

  const row = await queryOne<{
    total: string;
    published: string;
    scheduled: string;
    recent: string;
    channels: string;
  }>(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'published') AS published,
       COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
       COUNT(*) FILTER (WHERE created_at >= $3) AS recent,
       (SELECT COUNT(*) FROM integrations WHERE project_id = $1 AND is_active = true) AS channels
     FROM contents
     WHERE project_id = $1 AND user_id = $2`,
    [id, user.id, ago30]
  );

  return NextResponse.json({
    total:     Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    scheduled: Number(row?.scheduled ?? 0),
    recent:    Number(row?.recent ?? 0),
    channels:  Number(row?.channels ?? 0),
  });
}
