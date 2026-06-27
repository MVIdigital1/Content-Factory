import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, max_tokens = 500 } = await request.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content[0] as { text: string }).text;
  return NextResponse.json({ text });
}
