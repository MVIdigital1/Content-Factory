import { Metadata } from "next";
import { notFound } from "next/navigation";
import { queryOne, query } from "@/lib/db";
import PublicLandingClient from "./PublicLandingClient";

type Props = { params: Promise<{ slug: string }> };

type LandingRow = {
  id: string;
  title: string;
  created_at: string;
  content: {
    blocks: unknown[];
    bg_image?: string | null;
    settings?: {
      brandColor?: string;
      tone?: string;
      autoCloseDays?: number | null;
      widgets?: { chat?: boolean; quickCall?: boolean };
    };
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
    "SELECT id, title, created_at, content FROM landings WHERE slug = $1 AND published = true",
    [slug]
  );

  if (!landing) notFound();

  // increment view counter (fire-and-forget)
  query("UPDATE landings SET views = views + 1 WHERE id = $1", [landing.id]).catch(() => {});

  const content = (landing.content ?? {}) as {
    blocks?: unknown[];
    bg_image?: string | null;
    settings?: { brandColor?: string; autoCloseDays?: number | null; widgets?: { chat?: boolean; quickCall?: boolean } };
  };
  const blocks = content.blocks ?? [];
  const bgImage = content.bg_image ?? undefined;
  const brandColor = content.settings?.brandColor ?? "#6366f1";
  const autoCloseDays = content.settings?.autoCloseDays ?? null;
  const widgets = content.settings?.widgets ?? {};

  return (
    <PublicLandingClient
      landingId={landing.id}
      createdAt={landing.created_at}
      blocks={blocks as any}
      bgImage={bgImage}
      brandColor={brandColor}
      autoCloseDays={autoCloseDays}
      widgets={widgets}
    />
  );
}
