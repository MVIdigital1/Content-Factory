import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, style = "vivid", projectId } = await request.json();
  if (!prompt)
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey)
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );

  const fullPrompt = `${prompt}. Professional social media post visual. High quality, modern design, ${style === "vivid" ? "vibrant colors" : "natural realistic"}.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style,
    }),
  });

  const data = await res.json();
  if (!res.ok)
    return NextResponse.json(
      { error: data.error?.message || "Generation failed" },
      { status: 500 },
    );

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl)
    return NextResponse.json({ error: "No image generated" }, { status: 500 });

  // Сохранить в хранилище проекта если указан
  if (projectId) {
    await supabase.from("project_files").insert({
      project_id: projectId,
      user_id: user.id,
      name: `AI Image ${new Date().toLocaleDateString("ru-RU")}`,
      file_url: imageUrl,
      file_type: "image",
      size_bytes: 0,
    });
  }

  return NextResponse.json({ url: imageUrl });
}
