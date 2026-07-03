import { Metadata } from "next";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import PublicLandingClient from "./PublicLandingClient";

type Props = { params: Promise<{ slug: string }> };

type LandingRow = {
  id: string;
  title: string;
  content: {
    blocks: unknown[];
    bg_image?: string | null;
    settings?: { brandColor?: string; tone?: string };
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await queryOne<{ title: string }>(
    "SELECT title FROM landings WHERE slug = $1 AND published = true",
    [slug]
  );
  return { title: row?.title ?? "Лендинг" };
}

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;

  const landing = await queryOne<LandingRow>(
    "SELECT id, title, content FROM landings WHERE slug = $1 AND published = true",
    [slug]
  );

  if (!landing) notFound();

  const content = (landing.content ?? {}) as { blocks?: unknown[]; bg_image?: string | null; settings?: { brandColor?: string } };
  const blocks = content.blocks ?? [];
  const bgImage = content.bg_image ?? undefined;
  const brandColor = content.settings?.brandColor ?? "#6366f1";

  return (
    <PublicLandingClient
      landingId={landing.id}
      blocks={blocks as any}
      bgImage={bgImage}
      brandColor={brandColor}
    />
  );
}
