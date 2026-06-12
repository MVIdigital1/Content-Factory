import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const IG_API = "https://graph.instagram.com/v22.0";

// GET /api/instagram/posts?limit=20
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  // Get Instagram integration with token
  const { data: integration } = await supabase
    .from("integrations")
    .select("token, channel_id, channel_name")
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .eq("is_active", true)
    .single();

  if (!integration?.token) {
    return NextResponse.json({ data: [] });
  }

  // Fetch media list from Instagram Graph API
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count";
  const mediaRes = await fetch(
    `${IG_API}/${integration.channel_id}/media?fields=${fields}&limit=${limit}&access_token=${integration.token}`,
  );
  const mediaData = await mediaRes.json();

  if (mediaData.error) {
    return NextResponse.json(
      { error: mediaData.error.message, data: [] },
      { status: 400 },
    );
  }

  // For each post get insights (reach, impressions, saved)
  const posts = await Promise.all(
    (mediaData.data ?? []).map(async (item: any) => {
      let reach = 0,
        impressions = 0,
        saved = 0;

      try {
        // Only VIDEO and IMAGE support insights, not CAROUSEL_ALBUM at media level
        const insightMetrics =
          item.media_type === "VIDEO"
            ? "reach,impressions,saved,video_views"
            : "reach,impressions,saved";

        const insightRes = await fetch(
          `${IG_API}/${item.id}/insights?metric=${insightMetrics}&access_token=${integration.token}`,
        );
        const insightData = await insightRes.json();
        if (insightData.data) {
          insightData.data.forEach((metric: any) => {
            if (metric.name === "reach") reach = metric.values?.[0]?.value ?? 0;
            if (metric.name === "impressions")
              impressions = metric.values?.[0]?.value ?? 0;
            if (metric.name === "saved") saved = metric.values?.[0]?.value ?? 0;
          });
        }
      } catch {}

      return {
        id: item.id,
        platform: "instagram",
        text: item.caption ?? "",
        image_url: item.media_url ?? item.thumbnail_url ?? null,
        date: item.timestamp,
        likes: item.like_count ?? 0,
        comments: item.comments_count ?? 0,
        reach,
        impressions,
        saves: saved,
        type: item.media_type?.toLowerCase().replace("_album", "") ?? "post",
        url: item.permalink,
        channel_name: integration.channel_name,
      };
    }),
  );

  return NextResponse.json({ data: posts });
}
