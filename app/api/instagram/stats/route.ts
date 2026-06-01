import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const IG_API = "https://graph.instagram.com/v22.0";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { igMediaId } = await request.json();
  if (!igMediaId)
    return NextResponse.json({ error: "Missing igMediaId" }, { status: 400 });

  const { data: integration } = await supabase
    .from("integrations")
    .select("token, channel_id")
    .eq("platform", "instagram")
    .eq("is_active", true)
    .eq("user_id", user.id)
    .single();

  if (!integration)
    return NextResponse.json(
      { error: "Instagram не подключён" },
      { status: 400 },
    );

  // Получить insights поста
  const fields = "like_count,comments_count,reach,impressions,saved,shares";
  const res = await fetch(
    `${IG_API}/${igMediaId}?fields=${fields}&access_token=${integration.token}`,
  );
  const data = await res.json();

  if (data.error)
    return NextResponse.json({ error: data.error.message }, { status: 500 });

  return NextResponse.json({
    likes: data.like_count || 0,
    comments: data.comments_count || 0,
    reach: data.reach || 0,
    impressions: data.impressions || 0,
    saved: data.saved || 0,
    shares: data.shares || 0,
  });
}
