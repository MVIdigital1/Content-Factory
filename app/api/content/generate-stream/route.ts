import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Ты — профессиональный SMM-копирайтер MVI Content Factory.
Отвечай ТОЛЬКО валидным JSON без markdown. Пиши живо, без воды.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const { projectId, platform, contentType, goal, topic, imageUrl } = body;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return new Response("Project not found", { status: 404 });

  const { data: recentContents } = await supabase
    .from("contents")
    .select("caption")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(3);

  const recentPosts =
    recentContents?.map((c) => c.caption).filter(Boolean) ?? [];

  const prompt = `БРЕНД: ${project.name}
НИША: ${project.niche || ""}, ТОН: ${project.tone}, ЯЗЫК: ${project.language}
АУДИТОРИЯ: ${project.audience || ""}, ПЛАТФОРМА: ${platform}
ТИП: ${contentType}, ЦЕЛЬ: ${goal}, ТЕМА: ${topic}
${(project as any).stop_words ? `СТОП-СЛОВА: ${(project as any).stop_words}` : ""}
${recentPosts.length ? `ПРИМЕРЫ СТИЛЯ:\n${recentPosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : ""}

Ответь JSON: {"title":"...","idea":"...","hook":"...","caption":"...","hashtags":["..."],"cta":"...","script":[],"voiceover":"","screen_text":""}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        send("status", { message: "Анализирую бренд..." });

        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        let fullText = "";
        let statusSent = false;

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            fullText += chunk.delta.text;

            // Отправляем промежуточные статусы по ключевым словам в JSON
            if (!statusSent && fullText.includes('"hook"')) {
              send("status", { message: "Пишу хук..." });
              statusSent = true;
            }
            if (fullText.includes('"caption"') && statusSent) {
              send("status", { message: "Создаю текст поста..." });
              statusSent = false;
            }
            if (fullText.includes('"hashtags"')) {
              send("status", { message: "Подбираю хэштеги..." });
            }

            // Стримим частичный текст раз в 20 символов
            if (fullText.length % 20 === 0) {
              send("chunk", { text: chunk.delta.text });
            }
          }
        }

        send("status", { message: "Финализирую..." });

        // Парсим и сохраняем
        const clean = fullText
          .replace(/```json\s*/gi, "")
          .replace(/```/g, "")
          .trim();
        const generated = JSON.parse(clean);

        const { data: content } = await supabase
          .from("contents")
          .insert({
            project_id: projectId,
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

        send("done", { content: { ...generated, id: content?.id } });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
