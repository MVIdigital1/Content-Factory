import type { NextRequest } from "next/server";

const TITLES: Record<string, string> = {
  ru: "Создавай контент, который продаёт",
  uz: "Kontent yarating, u soting",
  en: "Create content that sells",
};

const SUBS: Record<string, string> = {
  ru: "AI-маркетинг платформа",
  uz: "AI Marketing Platform",
  en: "AI Marketing Platform",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? "ru";
  const title = TITLES[locale] ?? TITLES.ru;
  const sub = SUBS[locale] ?? SUBS.ru;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="rgba(201,132,122,0.18)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>

  <!-- background -->
  <rect width="1200" height="630" fill="#2d1b4e"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Prism logo: two crossing lines -->
  <g transform="translate(555, 80) scale(0.5)">
    <line x1="15" y1="140" x2="115" y2="10" stroke="#f0ebe3" stroke-width="10" stroke-linecap="round"/>
    <line x1="165" y1="140" x2="65" y2="10" stroke="#f0ebe3" stroke-width="10" stroke-linecap="round"/>
    <text x="90" y="168" font-family="Georgia, serif" font-size="22" fill="#c9847a" text-anchor="middle" letter-spacing="7">ira</text>
  </g>

  <!-- wordmark: mv + ira -->
  <text x="600" y="230" font-family="Georgia, serif" font-size="32" font-weight="300" fill="#f0ebe3" text-anchor="middle" letter-spacing="6">mv</text>
  <text x="648" y="230" font-family="Georgia, serif" font-size="32" font-weight="300" fill="#c9847a" text-anchor="start" letter-spacing="6">ira</text>

  <!-- sub label -->
  <text x="600" y="268" font-family="Arial, sans-serif" font-size="13" fill="#c9847a" text-anchor="middle" letter-spacing="5">${sub.toUpperCase()}</text>

  <!-- headline (two lines max) -->
  <text x="600" y="355" font-family="Georgia, serif" font-size="54" font-weight="300" fill="#f0ebe3" text-anchor="middle" letter-spacing="1">${title}</text>

  <!-- bottom strip -->
  <text x="600" y="580" font-family="Arial, sans-serif" font-size="13" fill="rgba(240,235,227,0.3)" text-anchor="middle" letter-spacing="5">TELEGRAM · INSTAGRAM · VK · MVIRA.UZ</text>

  <!-- subtle bottom line -->
  <line x1="0" y1="600" x2="1200" y2="600" stroke="rgba(201,132,122,0.15)" stroke-width="1"/>
</svg>`.trim();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
