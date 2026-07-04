"use client";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";

type Props = {
  landingId: string;
  blocks: Block[];
  bgImage?: string;
  brandColor?: string;
};

export default function PublicLandingClient({ landingId, blocks, bgImage, brandColor }: Props) {
  const handleLeadSubmit = async (data: { name: string; phone: string }) => {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landing_id: landingId, name: data.name, phone: data.phone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Ошибка сервера");
    }
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
