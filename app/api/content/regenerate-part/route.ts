import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Ты — профессиональный SMM-копирайтер. Отвечай ТОЛЬКО валидным JSON без markdown.`;

type Field = "hook" | "caption" | "hashtags" | "cta";

const FIELD_PROMPTS: Record<Field, (ctx: Record<string, string>) => string> = {
  hook: (ctx) => `Напиши новый цепляющий хук для этого поста.
Бренд: ${ctx.projectName}, Ниша: ${ctx.niche}, Тема: ${ctx.topic}, Тон: ${ctx.tone}
Текущий caption: ${ctx.caption}
Ответь JSON: { "hook": "новый хук" }`,

  caption: (ctx) => `Перепиши текст поста лучше.
Бренд: ${ctx.projectName}, Ниша: ${ctx.niche}, Тема: ${ctx.topic}, Тон: ${ctx.tone}, Платформа: ${ctx.platform}
Хук: ${ctx.hook}
Ответь JSON: { "caption": "новый текст" }`,

  hashtags: (ctx) => `Придумай 5-7 новых хэштегов для этого поста.
Бренд: ${ctx.projectName}, Ниша: ${ctx.niche}, Платформа: ${ctx.platform}
Caption: ${ctx.caption}
Ответь JSON: { "hashtags": ["хэштег1", "хэштег2", "хэштег3", "хэштег4", "хэштег5"] }`,

  cta: (ctx) => `Придумай новый призыв к действию.
Бренд: ${ctx.projectName}, Цель: ${ctx.goal}, Тон: ${ctx.tone}
Caption: ${ctx.caption}
Ответь JSON: { "cta": "новый призыв" }`,
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { contentId, field } = (await request.json()) as {
      contentId: string;
      field: Field;
    };

    if (!contentId || !field || !FIELD_PROMPTS[field])
      return NextResponse.json(
        { error: "Missing contentId or invalid field" },
        { status: 400 },
      );

    // Получить контент + проект
    const { data: content } = await supabase
      .from("contents")
      .select("*, projects!inner(name, niche, tone, user_id)")
      .eq("id", contentId)
      .eq("projects.user_id", user.id)
      .single();

    if (!content)
      return NextResponse.json({ error: "Content not found" }, { status: 404 });

    const project = content.projects as any;
    const ctx = {
      projectName: project.name,
      niche: project.niche || "",
      tone: project.tone || "friendly",
      topic: content.goal || "",
      goal: content.goal || "",
      platform: content.platform || "telegram",
      hook: content.hook || "",
      caption: content.caption || "",
    };

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: FIELD_PROMPTS[field](ctx) }],
    });

    const raw = (message.content[0] as { text: string }).text;
    const clean = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(clean);

    // Обновить поле в БД
    await supabase
      .from("contents")
      .update({ [field]: parsed[field] })
      .eq("id", contentId);

    return NextResponse.json({ ok: true, field, value: parsed[field] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
