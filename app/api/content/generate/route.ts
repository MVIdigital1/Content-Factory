import { createClient } from "@/lib/supabase/server";
import { generateContent } from "@/lib/ai/claude";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { projectId, platform, contentType, goal, topic, imageUrl, campaignId } = body;

    if (!projectId || !platform || !contentType || !goal || !topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Rate limit: 20 генераций в час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= 20) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 generations per hour." },
        { status: 429 },
      );
    }

    // Проверка что проект принадлежит пользователю
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Получить 3 последних поста для контекста стиля бренда
    const { data: recentContents } = await supabase
      .from("contents")
      .select("caption")
      .eq("project_id", projectId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3);

    const recentPosts = recentContents
      ?.map((c) => c.caption)
      .filter(Boolean) as string[] | undefined;

    const generated = await generateContent({
      projectName: project.name,
      niche: project.niche || "",
      description: project.description || "",
      audience: project.audience || "",
      tone: project.tone,
      language: project.language,
      platform,
      contentType,
      goal,
      topic,
      imageUrl,
      stopWords: (project as any).stop_words || null,
      recentPosts,
    });

    const { data: content, error: insertError } = await supabase
      .from("contents")
      .insert({
        project_id: projectId,
        campaign_id: campaignId || null,
        type: contentType,
        platform,
        goal,
        title: generated.title,
        idea: generated.idea,
        hook: generated.hook,
        script: generated.script || [],
        voiceover: generated.voiceover || "",
        screen_text: generated.screen_text || "",
        caption: generated.caption,
        hashtags: generated.hashtags || [],
        cta: generated.cta,
        source_image_url: imageUrl || null,
        status: "generated",
        ai_model: "claude-sonnet-4-5",
        ai_tokens: 3000,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json({ content });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
