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
    const { projectId, platform, contentType, goal, topic, imageUrl } = body;

    if (!projectId || !platform || !contentType || !goal || !topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Rate limiting — max 20 generations per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= 20) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 generations per hour." },
        { status: 429 },
      );
    }

    // Verify project belongs to current user — security fix
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id) // ← защита от чужих проектов
      .single();

    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

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
    });

    const { data: content, error: insertError } = await supabase
      .from("contents")
      .insert({
        user_id: user.id,
        project_id: projectId,
        type: contentType,
        platform,
        goal,
        title: generated.title,
        idea: generated.idea,
        hook: generated.hook,
        script: generated.script,
        voiceover: generated.voiceover,
        screen_text: generated.screen_text,
        caption: generated.caption,
        hashtags: generated.hashtags,
        cta: generated.cta,
        source_image_url: imageUrl || null,
        status: "generated",
        ai_model: "claude-sonnet-4-20250514",
        ai_tokens: 1500,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
