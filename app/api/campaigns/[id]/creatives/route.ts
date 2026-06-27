import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const creatives = await query(
    `SELECT ac.* FROM ad_creatives ac
     JOIN ad_campaigns c ON ac.campaign_id = c.id
     WHERE ac.campaign_id = $1 AND c.user_id = $2
     ORDER BY ac.created_at DESC`,
    [id, user.id]
  );
  return NextResponse.json(creatives);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;
  const url = new URL(request.url);
  const creativeId = url.searchParams.get("creativeId");
  if (!creativeId) return NextResponse.json({ error: "Missing creativeId" }, { status: 400 });

  const body = await request.json();
  const creative = await queryOne(
    `UPDATE ad_creatives SET status = $1 WHERE id = $2 AND campaign_id = $3 RETURNING *`,
    [body.status, creativeId, campaignId]
  );
  return NextResponse.json(creative);
}
