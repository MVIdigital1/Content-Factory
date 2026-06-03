import { generateContent } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TONE_VARIANTS = [
  { tone: "friendly", label: "Дружелюбный" },
  { tone: "viral", label: "Вирусный" },
  { tone: "expert", label: "Экспертный" },
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { projectId, platform, contentType, goal, topic, imageUrl, campaignId } = body;

    if (!projectId || !platform || !contentType || !goal || !topic)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Получить 3 последних поста для контекста
    const { data: recentContents } = await supabase
      .from("contents")
      .select("caption")
      .eq("project_id", projectId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3);

    const recentPosts = recentContents?.map((c) => c.caption).filter(Boolean) as string[];

    // Генерируем 3 варианта параллельно с разными тонами
    const variantTones = project.tone
      ? [project.tone, ...TONE_VARIANTS.filter((t) => t.tone !== project.tone).map((t) => t.tone).slice(0, 2)]
      : TONE_VARIANTS.map((t) => t.tone);

    const results = await Promise.allSettled(
      variantTones.map((tone) =>
        generateContent({
          projectName: project.name,
          niche: project.niche || "",
          description: project.description || "",
          audience: project.audience || "",
          tone,
          language: project.language,
          platform,
          contentType,
          goal,
          topic,
          imageUrl,
          stopWords: (project as any).stop_words || null,
          recentPosts,
        }),
      ),
    );

    // Собираем успешные варианты
    const variants = results
      .map((r, i) => ({
        tone: variantTones[i],
        toneLabel: TONE_VARIANTS.find((t) => t.tone === variantTones[i])?.label || variantTones[i],
        content: r.status === "fulfilled" ? r.value : null,
        error: r.status === "rejected" ? (r.reason as Error).message : null,
      }))
      .filter((v) => v.content !== null);

    if (variants.length === 0)
      return NextResponse.json({ error: "Все варианты не удалось сгенерировать" }, { status: 500 });

    // Сохраняем первый вариант в БД как основной, остальные — как drafts
    const inserts = await Promise.all(
      variants.map((v, i) =>
        supabase
          .from("contents")
          .insert({
            project_id: projectId,
            campaign_id: campaignId || null,
            type: contentType,
            platform,
            goal,
            title: v.content!.title,
            idea: v.content!.idea,
            hook: v.content!.hook,
            script: v.content!.script || [],
            voiceover: v.content!.voiceover || "",
            screen_text: v.content!.screen_text || "",
            caption: v.content!.caption,
            hashtags: v.content!.hashtags || [],
            cta: v.content!.cta,
            source_image_url: imageUrl || null,
            status: "generated",
            ai_model: "claude-sonnet-4-5",
            ai_tokens: 3000,
          })
          .select()
          .single(),
      ),
    );

    const savedVariants = inserts.map((ins, i) => ({
      ...variants[i],
      id: ins.data?.id,
      content: { ...variants[i].content, id: ins.data?.id },
    }));

    return NextResponse.json({ variants: savedVariants });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
