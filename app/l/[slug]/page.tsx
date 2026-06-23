import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PublicLandingClient from "./PublicLandingClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_pages")
    .select("title")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  return {
    title: data?.title ?? "Лендинг",
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: landing } = await supabase
    .from("landing_pages")
    .select("id, title, blocks, bg_image, settings")
    .eq("slug", slug)
    .eq("published", true)
    .single();

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
