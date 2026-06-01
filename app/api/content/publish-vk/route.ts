import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

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
    .select("token, channel_id")
    .eq("platform", "vk")
    .eq("is_active", true)
    .eq("user_id", user.id)
    .single();

  if (!integration)
    return NextResponse.json(
      { error: "ВКонтакте не подключён" },
      { status: 400 },
    );

  const message = [
    content.caption || "",
    (content.hashtags || []).map((h: string) => `#${h}`).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  const params = new URLSearchParams({
    owner_id: `-${integration.channel_id}`, // группа
    message,
    access_token: integration.token,
    v: VK_VERSION,
  });

  if (content.source_image_url) {
    params.append("attachments", content.source_image_url);
  }

  const res = await fetch(`${VK_API}/wall.post?${params}`);
  const data = await res.json();

  if (data.error) {
    await supabase
      .from("publish_logs")
      .insert({
        content_id: contentId,
        platform: "vk",
        status: "failed",
        error_message: data.error.error_msg,
      });
    return NextResponse.json({ error: data.error.error_msg }, { status: 500 });
  }

  await Promise.all([
    supabase
      .from("contents")
      .update({ status: "published" })
      .eq("id", contentId),
    supabase
      .from("publish_logs")
      .insert({ content_id: contentId, platform: "vk", status: "published" }),
  ]);

  return NextResponse.json({ ok: true, post_id: data.response?.post_id });
}
