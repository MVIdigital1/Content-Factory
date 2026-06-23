"use client";
import { createClient } from "@/lib/supabase/client";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";

type Props = {
  landingId: string;
  blocks: Block[];
  bgImage?: string;
  brandColor?: string;
};

export default function PublicLandingClient({ landingId, blocks, bgImage, brandColor }: Props) {
  const supabase = createClient();

  const handleLeadSubmit = async (data: { name: string; phone: string }) => {
    await supabase.from("leads").insert({
      landing_id: landingId,
      name: data.name,
      phone: data.phone,
    });
  };

  return (
    <LandingRenderer
      blocks={blocks}
      bgImage={bgImage}
      brandColor={brandColor}
      onLeadSubmit={handleLeadSubmit}
    />
  );
}
