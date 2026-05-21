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
    const { projectId, platform, contentType, goal, topic } = body;

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
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
    });

    const { data: content, error: insertError } = await supabase
      .from("contents")
      .insert({
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
