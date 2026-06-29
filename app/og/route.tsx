import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? "ru";

  const titles: Record<string, string> = {
    ru: "Создавай контент, который продаёт",
    uz: "Kontent yarating, u soting",
    en: "Create content that sells",
  };

  const subs: Record<string, string> = {
    ru: "AI-маркетинг платформа",
    uz: "AI Marketing Platform",
    en: "AI Marketing Platform",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#2d1b4e",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* subtle gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(201,132,122,0.18), transparent 70%)",
            display: "flex",
          }}
        />

        {/* Prism logo mark — two crossing lines */}
        <svg
          width="90"
          height="90"
          viewBox="0 0 180 178"
          style={{ marginBottom: 32 }}
        >
          <line x1="15" y1="140" x2="115" y2="10" stroke="#f0ebe3" strokeWidth="10" strokeLinecap="round" />
          <line x1="165" y1="140" x2="65" y2="10" stroke="#f0ebe3" strokeWidth="10" strokeLinecap="round" />
          <text x="90" y="168" fontFamily="Georgia, serif" fontSize="22" fill="#c9847a" textAnchor="middle" letterSpacing="7">ira</text>
        </svg>

        {/* wordmark */}
        <div style={{ fontSize: 28, color: "#f0ebe3", fontWeight: 300, letterSpacing: "0.12em", marginBottom: 8, display: "flex" }}>
          mv<span style={{ color: "#c9847a" }}>ira</span>
        </div>

        {/* sub */}
        <div style={{ fontSize: 13, color: "#c9847a", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 48, display: "flex" }}>
          {subs[locale] ?? subs.ru}
        </div>

        {/* headline */}
        <div style={{
          fontSize: 52,
          fontWeight: 300,
          color: "#f0ebe3",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "0.02em",
          maxWidth: 860,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {titles[locale] ?? titles.ru}
        </div>

        {/* bottom bar */}
        <div style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
          color: "rgba(240,235,227,0.35)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          <span>Telegram</span>
          <span style={{ color: "rgba(240,235,227,0.2)" }}>·</span>
          <span>Instagram</span>
          <span style={{ color: "rgba(240,235,227,0.2)" }}>·</span>
          <span>VK</span>
          <span style={{ color: "rgba(240,235,227,0.2)" }}>·</span>
          <span>mvira.uz</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
