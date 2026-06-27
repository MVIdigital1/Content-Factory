import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const IG_API = "https://graph.instagram.com/v22.0";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { igMediaId } = await request.json();
  if (!igMediaId) return NextResponse.json({ error: "Missing igMediaId" }, { status: 400 });

  const integration = await queryOne<{ token: string; channel_id: string }>(
    "SELECT token, channel_id FROM integrations WHERE user_id = $1 AND platform = 'instagram' AND is_active = true LIMIT 1",
    [user.id]
  );

  if (!integration) return NextResponse.json({ error: "Instagram не подключён" }, { status: 400 });

  const fields = "like_count,comments_count,reach,impressions,saved,shares";
  const res = await fetch(`${IG_API}/${igMediaId}?fields=${fields}&access_token=${integration.token}`);
  const data = await res.json();

  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

  return NextResponse.json({
    likes: data.like_count || 0,
    comments: data.comments_count || 0,
    reach: data.reach || 0,
    impressions: data.impressions || 0,
    saved: data.saved || 0,
    shares: data.shares || 0,
  });
}
