import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

async function sendToMake(payload: {
  contentId: string;
  platform: string;
  caption: string;
  hashtags: string[];
  image_url: string | null;
}) {
  if (!MAKE_WEBHOOK_URL) return;
  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Make.com webhook error:", err);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { contentId, platform } = await request.json();
    if (!contentId)
      return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

    // Get content
    const { data: content, error: contentError } = await supabase
      .from("contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (contentError) {
      console.error("Content fetch error:", contentError);
      return NextResponse.json(
        { error: contentError.message },
        { status: 500 },
      );
    }

    if (!content)
      return NextResponse.json({ error: "Content not found" }, { status: 404 });

    if (platform === "telegram") {
      const { data: integration, error: integrationError } = await supabase
        .from("integrations")
        .select("token, channel_id")
        .eq("platform", "telegram")
        .eq("is_active", true)
        .eq("user_id", user.id)
        .single();

      if (integrationError) {
        console.error("Integration fetch error:", integrationError);
        return NextResponse.json(
          { error: integrationError.message },
          { status: 500 },
        );
      }

      if (!integration)
        return NextResponse.json(
          { error: "No active Telegram channel. Connect one first." },
          { status: 400 },
        );

      const text =
        `${content.caption || ""}\n\n${(content.hashtags || []).join(" ")}`.trim();
      const imageUrl = content.source_image_url;

      const endpoint = imageUrl ? "sendPhoto" : "sendMessage";
      const body = imageUrl
        ? {
            chat_id: integration.channel_id,
            photo: imageUrl,
            caption: text,
            parse_mode: "HTML",
          }
        : { chat_id: integration.channel_id, text, parse_mode: "HTML" };

      const res = await fetch(
        `https://api.telegram.org/bot${integration.token}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const tgData = await res.json();
      if (!tgData.ok) {
        console.error("Telegram error:", tgData);
        return NextResponse.json(
          { error: tgData.description || "Telegram error" },
          { status: 500 },
        );
      }

      await supabase
        .from("contents")
        .update({ status: "published" })
        .eq("id", contentId);

      await sendToMake({
        contentId,
        platform: "telegram",
        caption: content.caption || "",
        hashtags: content.hashtags || [],
        image_url: content.source_image_url || null,
      });

      return NextResponse.json({
        ok: true,
        message_id: tgData.result.message_id,
      });
    }

    // Для других платформ — отправляем в Make.com
    await sendToMake({
      contentId,
      platform,
      caption: content.caption || "",
      hashtags: content.hashtags || [],
      image_url: content.source_image_url || null,
    });

    await supabase
      .from("contents")
      .update({ status: "published" })
      .eq("id", contentId);

    return NextResponse.json({ ok: true, via: "make" });
  } catch (error: any) {
    console.error("Publish error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Publish failed" },
      { status: 500 },
    );
  }
}
