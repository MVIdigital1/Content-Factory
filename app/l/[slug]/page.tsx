import { Metadata } from "next";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import PublicLandingClient from "./PublicLandingClient";

type Props = { params: Promise<{ slug: string }> };

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

  const landing = await queryOne<{
    id: string;
    blocks: unknown;
    bg_image: string | null;
    settings: unknown;
  }>(
    "SELECT id, blocks, bg_image, settings FROM landings WHERE slug = $1 AND published = true",
    [slug]
  );

  if (!landing) notFound();

  return (
    <PublicLandingClient
      landingId={landing.id}
      blocks={landing.blocks as any}
      bgImage={landing.bg_image ?? undefined}
      brandColor={(landing.settings as any)?.brandColor ?? "#6366f1"}
    />
  );
}
