import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, style = "vivid" } = await request.json();
  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });

  const fullPrompt = `${prompt}. Professional social media post visual. High quality, modern design, ${style === "vivid" ? "vibrant colors" : "natural realistic"}.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt: fullPrompt, n: 1, size: "1024x1024", quality: "standard", style }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || "Generation failed" }, { status: 500 });

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) return NextResponse.json({ error: "No image generated" }, { status: 500 });

  return NextResponse.json({ url: imageUrl });
}
