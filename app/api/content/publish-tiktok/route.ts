import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// TikTok Content Posting API v2
const TIKTOK_API = "https://open.tiktokapis.com/v2";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();

  const { data: content } = await supabase
    .from("contents")
    .select("*, projects!inner(user_id)")
    .eq("id", contentId)
    .eq("projects.user_id", user.id)
    .single();

  if (!content)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: integration } = await supabase
    .from("integrations")
    .select("token")
    .eq("platform", "tiktok")
    .eq("is_active", true)
    .eq("user_id", user.id)
    .single();

  if (!integration) {
    return NextResponse.json(
      { error: "TikTok не подключён. Требуется Business аккаунт TikTok." },
      { status: 400 },
    );
  }

  if (!content.source_image_url) {
    return NextResponse.json(
      { error: "TikTok требует видео или фото для публикации" },
      { status: 400 },
    );
  }

  const caption = [
    content.caption || "",
    (content.hashtags || []).map((h: string) => `#${h}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  // Инициализировать загрузку фото
  const initRes = await fetch(`${TIKTOK_API}/post/publish/content/init/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${integration.token}`,
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [content.source_image_url],
      },
    }),
  });

  const initData = await initRes.json();

  if (initData.error?.code !== "ok") {
    await supabase
      .from("publish_logs")
      .insert({
        content_id: contentId,
        platform: "tiktok",
        status: "failed",
        error_message: initData.error?.message,
      });
    return NextResponse.json(
      { error: initData.error?.message || "TikTok error" },
      { status: 500 },
    );
  }

  await Promise.all([
    supabase
      .from("contents")
      .update({ status: "published" })
      .eq("id", contentId),
    supabase
      .from("publish_logs")
      .insert({
        content_id: contentId,
        platform: "tiktok",
        status: "published",
      }),
  ]);

  return NextResponse.json({ ok: true, publish_id: initData.data?.publish_id });
}
