import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const landing = await queryOne<{
    id: string;
    title: string;
    blocks: unknown;
    bg_image: string | null;
    settings: unknown;
  }>(
    "SELECT id, title, blocks, bg_image, settings FROM landings WHERE slug = $1 AND published = true",
    [slug]
  );

  if (!landing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(landing);
}
