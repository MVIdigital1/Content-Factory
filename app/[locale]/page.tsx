"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Logo from "@/components/ui/Logo";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeneratedPost {
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = "#00C9A7";

const PRIMARY = "#2d1b4e";
const ACCENT = "#c9847a";
const WARM = "#e8c4a0";
const CREAM = "#f0ebe3";
const MID = "#5a3d7a";

const NICHES = [
  { id: "it", label: "IT / Стартап", emoji: "💻" },
  { id: "ecommerce", label: "E-commerce", emoji: "🛍️" },
  { id: "beauty", label: "Красота / Бьюти", emoji: "💄" },
  { id: "food", label: "Еда / Ресторан", emoji: "🍽️" },
  { id: "fitness", label: "Фитнес / Спорт", emoji: "💪" },
  { id: "education", label: "Образование", emoji: "📚" },
  { id: "real_estate", label: "Недвижимость", emoji: "🏠" },
  { id: "finance", label: "Финансы", emoji: "📈" },
  { id: "travel", label: "Туризм", emoji: "✈️" },
  { id: "marketing", label: "Маркетинг", emoji: "📣" },
];

const TONES = [
  { id: "expert", label: "Экспертный" },
  { id: "friendly", label: "Дружелюбный" },
  { id: "viral", label: "Вирусный" },
  { id: "selling", label: "Продающий" },
];

const SOCIALS = [
  { id: "instagram", name: "Instagram", sub: "@profile", color: "#e07090", shadow: "#160810", bg: "#28101c", icon: "◈" },
  { id: "telegram", name: "Telegram", sub: "@channel", color: "#4db8e8", shadow: "#061524", bg: "#0d2236", icon: "✈" },
  { id: "vk", name: "VK", sub: "vk.com/page", color: "#5a8ce8", shadow: "#060e1e", bg: "#0d1a30", icon: "⬡" },
];

// ─── Canvas animation ─────────────────────────────────────────────────────────
function useNodeCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    interface Pt { x: number; y: number; vx: number; vy: number; r: number; p: number; }
    let W = 0, H = 0, rafId = 0, alive = true;
    const N = 55, CONN = 130, MR = 160;
    const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const pts: Pt[] = Array.from({ length: N }, () => ({
      x: Math.random() * (W || 800), y: Math.random() * (H || 500),
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 1.8, p: Math.random() * Math.PI * 2,
    }));
    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      for (const n of pts) {
        n.x += n.vx; n.y += n.vy; n.p += 0.018;
        if (n.x < 0) n.x = W; if (n.x > W) n.x = 0;
        if (n.y < 0) n.y = H; if (n.y > H) n.y = 0;
        const dx = n.x - mx, dy = n.y - my, d = Math.hypot(dx, dy);
        if (d < MR && d > 0) {
          const f = ((MR - d) / MR) * 0.018;
          n.vx += (dx / d) * f; n.vy += (dy / d) * f;
          const sp = Math.hypot(n.vx, n.vy);
          if (sp > 0.9) { n.vx = (n.vx / sp) * 0.9; n.vy = (n.vy / sp) * 0.9; }
        }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < CONN) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,201,167,${(1 - d / CONN) * 0.25})`;
            ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      for (const n of pts) {
        const p = 0.65 + 0.35 * Math.sin(n.p);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,201,167,${0.04 * p})`; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,201,167,${0.6 * p})`; ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => { alive = false; cancelAnimationFrame(rafId); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, [canvasRef]);

  const onMouseLeave = useCallback(() => { mouseRef.current = { x: -9999, y: -9999 }; }, []);
  return { onMouseMove, onMouseLeave };
}

// ─── Wire pulse ───────────────────────────────────────────────────────────────
function runWirePulse(svgEl: SVGSVGElement, startY: number, endY: number, color: string, duration: number, onDone: () => void) {
  const x1 = 72, y1 = startY, x2 = 8, y2 = endY;
  const cp1x = x1 - 28, cp2x = x2 + 28;
  const tLen = 230, dLen = tLen * 0.18;
  let t0: number | null = null;
  const step = (ts: number) => {
    if (!t0) t0 = ts;
    const raw = Math.min((ts - t0) / duration, 1);
    const e = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw;
    const off = tLen - tLen * e;
    const t = e;
    const gx = (1 - t) ** 3 * x1 + 3 * (1 - t) ** 2 * t * cp1x + 3 * (1 - t) * t ** 2 * cp2x + t ** 3 * x2;
    const gy = (1 - t) ** 3 * y1 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * y2;
    svgEl.innerHTML = [
      `<path d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="rgba(0,201,167,.09)" stroke-width="6" stroke-linecap="round"/>`,
      `<path d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dLen} ${tLen}" stroke-dashoffset="${off}"/>`,
      `<circle cx="${gx}" cy="${gy}" r="5" fill="${color}"/>`,
      `<circle cx="${gx}" cy="${gy}" r="11" fill="${color}" opacity=".2"/>`,
      `<circle cx="${gx}" cy="${gy}" r="22" fill="${color}" opacity=".07"/>`,
    ].join("");
    if (raw < 1) requestAnimationFrame(step);
    else { svgEl.innerHTML = ""; onDone(); }
  };
  requestAnimationFrame(step);
}

// ─── Post previews ────────────────────────────────────────────────────────────
function TelegramPreview({ post, niche }: { post: GeneratedPost; niche: (typeof NICHES)[0] | undefined }) {
  return (
    <div style={{ background: "#17212b", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(77,184,232,.2)" }}>
      <div style={{ background: "#232e3c", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(77,184,232,.1)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2b5278", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{niche?.emoji ?? "🚀"}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{niche?.label ?? "Channel"}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>1 248 подписчиков</div>
        </div>
        <span style={{ marginLeft: "auto", color: "#4db8e8", fontSize: 13 }}>···</span>
      </div>
      <div style={{ padding: "14px" }}>
        <div style={{ background: "#182533", borderRadius: "4px 12px 12px 12px", padding: "12px 14px", maxWidth: "90%", borderLeft: "3px solid #4db8e8" }}>
          <div style={{ fontSize: 13, color: "#e8f5f2", lineHeight: 1.6, marginBottom: 8 }}>
            <strong style={{ color: "#4db8e8" }}>{post.hook}</strong><br /><br />{post.caption}
          </div>
          {post.hashtags?.length > 0 && <div style={{ fontSize: 11, color: "#4db8e8", lineHeight: 1.6 }}>{post.hashtags.map((h) => `#${h}`).join(" ")}</div>}
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 8, textAlign: "right" }}>14:32 ✓✓</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {["👍 48", "🔥 22", "❤️ 15"].map((r) => (
            <span key={r} style={{ background: "rgba(77,184,232,.1)", border: "1px solid rgba(77,184,232,.2)", borderRadius: 20, padding: "3px 8px", fontSize: 11, color: "#4db8e8" }}>{r}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ post, niche }: { post: GeneratedPost; niche: (typeof NICHES)[0] | undefined }) {
  return (
    <div style={{ background: "#0a1210", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(224,112,144,.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{niche?.emoji ?? "🚀"}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e8f5f2" }}>{niche?.label ?? "brand"}</div>
          <div style={{ fontSize: 10, color: "rgba(232,245,242,.35)", marginTop: 1 }}>только что</div>
        </div>
        <span style={{ marginLeft: "auto", color: "rgba(232,245,242,.3)", fontSize: 16 }}>···</span>
      </div>
      <div style={{ width: "100%", height: 180, position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#061410,#0a2e28,#062018,#040e0a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 50% at 30% 40%, rgba(224,112,144,.15), transparent 60%)" }} />
        <span style={{ fontSize: 11, color: "rgba(224,112,144,.35)", letterSpacing: ".12em", position: "relative" }}>AI · IMAGE</span>
      </div>
      <div style={{ display: "flex", gap: 12, padding: "10px 14px 4px", fontSize: 18, color: "#e8f5f2" }}>
        <span>♡</span><span>💬</span><span>✈</span><span style={{ marginLeft: "auto" }}>🔖</span>
      </div>
      <div style={{ padding: "0 14px 5px", fontSize: 12, fontWeight: 600, color: "#e8f5f2" }}>1 248 отметок «Нравится»</div>
      <div style={{ padding: "0 14px 6px", fontSize: 12, lineHeight: 1.55, color: "#e8f5f2" }}>
        <strong style={{ fontWeight: 600 }}>{niche?.label.toLowerCase().replace(/\s/g, "_") ?? "brand"}</strong>{" "}{post.hook}
      </div>
      {post.hashtags?.length > 0 && <div style={{ padding: "0 14px 8px", fontSize: 11, color: TEAL, lineHeight: 1.6 }}>{post.hashtags.map((h) => `#${h}`).join(" ")}</div>}
      <div style={{ padding: "0 14px 12px", fontSize: 10, color: "rgba(232,245,242,.3)", letterSpacing: ".05em" }}>2 минуты назад</div>
    </div>
  );
}

function VKPreview({ post, niche }: { post: GeneratedPost; niche: (typeof NICHES)[0] | undefined }) {
  return (
    <div style={{ background: "#1a1f2e", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(90,140,232,.2)" }}>
      <div style={{ padding: "14px", borderBottom: "1px solid rgba(90,140,232,.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#2a3550", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{niche?.emoji ?? "🚀"}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f0ff" }}>{niche?.label ?? "Сообщество"}</div>
            <div style={{ fontSize: 10, color: "rgba(232,240,255,.35)" }}>только что</div>
          </div>
          <span style={{ marginLeft: "auto", color: "#5a8ce8", fontSize: 18 }}>···</span>
        </div>
        <div style={{ fontSize: 13, color: "#e8f0ff", lineHeight: 1.6, marginBottom: 10 }}>{post.hook}<br /><br />{post.caption}</div>
        <div style={{ width: "100%", height: 150, borderRadius: 8, background: "linear-gradient(135deg,#0d1525,#1a2a50,#0d1a35)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 50% at 40% 40%, rgba(90,140,232,.15), transparent 60%)" }} />
          <span style={{ fontSize: 11, color: "rgba(90,140,232,.4)", letterSpacing: ".12em", position: "relative" }}>AI · IMAGE</span>
        </div>
      </div>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 16 }}>
        {[["❤️", "312"], ["💬", "48"], ["↗", "94"]].map(([icon, cnt]) => (
          <span key={icon} style={{ fontSize: 12, color: "rgba(232,240,255,.45)", display: "flex", alignItems: "center", gap: 4 }}>
            <span>{icon}</span><span>{cnt}</span>
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(90,140,232,.5)" }}>Поделиться</span>
      </div>
    </div>
  );
}

function PostPreview({ platform, post, niche }: { platform: string | null; post: GeneratedPost; niche: (typeof NICHES)[0] | undefined }) {
  if (platform === "telegram") return <TelegramPreview post={post} niche={niche} />;
  if (platform === "vk") return <VKPreview post={post} niche={niche} />;
  return <InstagramPreview post={post} niche={niche} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const locale = useLocale();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wireSvgRef = useRef<SVGSVGElement>(null);
  const wzoneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const socialRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { onMouseMove, onMouseLeave } = useNodeCanvas(canvasRef);

  const [selectedNiche, setSelectedNiche] = useState("");
  const [selectedTone, setSelectedTone] = useState("friendly");
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [wireRunning, setWireRunning] = useState(false);
  const [pubVisible, setPubVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [wirePaths, setWirePaths] = useState<Record<string, number>>({});

  const calcWirePaths = useCallback(() => {
    const wzone = wzoneRef.current;
    if (!wzone) return;
    const wzR = wzone.getBoundingClientRect();
    const paths: Record<string, number> = {};
    for (const s of SOCIALS) {
      const btn = socialRefs.current[s.id];
      if (!btn) continue;
      const btnR = btn.getBoundingClientRect();
      paths[s.id] = btnR.top - wzR.top + btnR.height / 2;
    }
    setWirePaths(paths);
  }, []);

  useEffect(() => {
    const t = setTimeout(calcWirePaths, 100);
    window.addEventListener("resize", calcWirePaths);
    return () => { clearTimeout(t); window.removeEventListener("resize", calcWirePaths); };
  }, [calcWirePaths]);

  useEffect(() => {
    if (selectedNiche && !formReady) setFormReady(true);
  }, [selectedNiche, formReady]);

  const handleSocialClick = useCallback((s: (typeof SOCIALS)[0]) => {
    if (!formReady || wireRunning) return;
    const btn = socialRefs.current[s.id];
    const wzone = wzoneRef.current;
    const svg = wireSvgRef.current;
    if (!btn || !wzone || !svg) return;
    setSelectedSocial(s.id);
    setWireRunning(true);
    setPubVisible(false);
    setPost(null);
    const wzR = wzone.getBoundingClientRect();
    const btnR = btn.getBoundingClientRect();
    const startY = btnR.top - wzR.top + btnR.height / 2;
    const endY = wzone.offsetHeight / 2;
    svg.setAttribute("height", String(wzone.offsetHeight));
    runWirePulse(svg, startY, endY, s.color, 1800, () => { setWireRunning(false); setPubVisible(true); });
  }, [formReady, wireRunning]);

  const handlePublish = async () => {
    if (!selectedNiche || !selectedSocial) return;
    setGenerating(true);
    setPost(null);
    try {
      const res = await fetch("/api/demo-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: selectedNiche, tone: selectedTone, platform: selectedSocial }),
      });
      setPost(await res.json());
    } catch {
      setPost(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleCta = () => {
    setCtaLoading(true);
    router.push(`/${locale}/auth/register`);
  };

  const nicheObj = NICHES.find((n) => n.id === selectedNiche);
  const socialObj = SOCIALS.find((s) => s.id === selectedSocial);
  const wzH = wzoneRef.current?.offsetHeight ?? 560;
  const centerY = wzH / 2;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 48px",
        borderBottom: "1px solid rgba(45,27,78,0.1)",
        background: "rgba(240,235,227,0.94)",
        backdropFilter: "blur(12px)",
      }}>
        <Logo variant="dark" size={32} horizontal />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push(`/${locale}/auth/login`)}
            style={{ background: "transparent", border: "1px solid rgba(45,27,78,0.2)", color: "rgba(45,27,78,0.65)", padding: "7px 18px", borderRadius: 2, fontSize: 12, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit" }}
          >
            Войти
          </button>
          <button
            onClick={handleCta}
            disabled={ctaLoading}
            style={{ background: PRIMARY, border: "none", color: CREAM, padding: "7px 20px", borderRadius: 2, fontSize: 12, letterSpacing: "0.1em", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            {ctaLoading ? "..." : "Начать бесплатно"}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: PRIMARY,
        minHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px 48px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 70% at 50% 30%, rgba(201,132,122,0.12), transparent 65%)" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <Logo variant="light" size={96} />

          <div style={{ marginTop: 48, marginBottom: 16 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase", color: ACCENT }}>
              AI-маркетинг платформа
            </span>
          </div>

          <h1 style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(52px,8vw,96px)",
            lineHeight: 1.05,
            letterSpacing: "0.02em",
            color: CREAM,
            margin: "0 0 28px",
          }}>
            Создавай контент,<br />
            <em style={{ color: WARM, fontStyle: "italic" }}>который продаёт</em>
          </h1>

          <p style={{ fontSize: 17, color: "rgba(232,196,160,0.7)", maxWidth: 480, margin: "0 auto 44px", lineHeight: 1.7, fontWeight: 300 }}>
            Генерируй посты, сторис и рекламу для Telegram, Instagram и VK за секунды с помощью AI.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: ACCENT, border: "none", color: "#fff", padding: "14px 36px", borderRadius: 2, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#b87269"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ACCENT; }}
            >
              Попробовать бесплатно
            </button>
            <button
              onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: "transparent", border: "1px solid rgba(240,235,227,0.25)", color: "rgba(240,235,227,0.7)", padding: "14px 36px", borderRadius: 2, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(240,235,227,0.5)"; (e.currentTarget as HTMLElement).style.color = CREAM; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(240,235,227,0.25)"; (e.currentTarget as HTMLElement).style.color = "rgba(240,235,227,0.7)"; }}
            >
              Как это работает
            </button>
          </div>

          <p style={{ marginTop: 24, fontSize: 10, color: "rgba(240,235,227,0.25)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Без карты · Бесплатно · 30 секунд
          </p>
        </div>
      </section>

      {/* ── STRIP ── */}
      <div style={{ overflow: "hidden", background: MID, padding: "13px 0" }}>
        <div style={{ display: "flex", animation: "marquee 22s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
          {["INSTAGRAM", "·", "TELEGRAM", "·", "VK", "·", "AI КОНТЕНТ", "·", "АВТОПОСТИНГ", "·", "АНАЛИТИКА", "·", "МАРКЕТИНГ", "·",
            "INSTAGRAM", "·", "TELEGRAM", "·", "VK", "·", "AI КОНТЕНТ", "·", "АВТОПОСТИНГ", "·", "АНАЛИТИКА", "·", "МАРКЕТИНГ", "·"].map((w, i) => (
            <span key={i} style={{ paddingRight: 36, fontSize: 10, letterSpacing: "0.22em", color: w === "·" ? "rgba(240,235,227,0.2)" : "rgba(240,235,227,0.55)" }}>
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* ── DEMO ── */}
      <section id="demo" style={{ padding: "80px 24px", background: "#0d0820" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 10, color: ACCENT, letterSpacing: ".28em", textTransform: "uppercase", marginBottom: 10 }}>Живое демо</div>
          <h2 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "clamp(32px,5vw,52px)", letterSpacing: "0.02em", color: CREAM, marginBottom: 10 }}>
            Попробуй прямо здесь
          </h2>
          <p style={{ fontSize: 15, color: "rgba(240,235,227,0.4)", maxWidth: 460, margin: "0 auto" }}>
            Выбери нишу и тон — AI сгенерирует пост. Выбери соцсеть и опубликуй.
          </p>
        </div>

        <div
          ref={stageRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{
            position: "relative", maxWidth: 940, margin: "0 auto", minHeight: 560,
            borderRadius: 4, border: "1px solid rgba(201,132,122,0.15)", overflow: "hidden",
            display: "grid", gridTemplateColumns: "1fr 80px 220px", alignItems: "stretch",
          }}
        >
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 25%, rgba(13,8,32,.65) 100%)" }} />

          {/* Glass form */}
          <div style={{
            position: "relative", zIndex: 2, margin: 24, padding: "26px 22px",
            background: "rgba(26,13,62,.78)", border: "1px solid rgba(201,132,122,0.18)",
            borderRadius: 4, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 0 0 1px rgba(201,132,122,.05), 0 24px 48px rgba(0,0,0,.5), inset 0 1px 0 rgba(201,132,122,.1)",
            display: "flex", flexDirection: "column", gap: 18,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: CREAM, fontFamily: "Cormorant Garamond, Georgia, serif", letterSpacing: "0.04em" }}>Создать пост с AI</div>
              <div style={{ fontSize: 11, color: "rgba(201,132,122,0.6)", marginTop: 3 }}>Без регистрации · виртуальный канал</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: ACCENT, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 9 }}>Выберите нишу</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {NICHES.map((n) => (
                  <button key={n.id} onClick={() => setSelectedNiche(n.id)} style={{
                    background: selectedNiche === n.id ? "rgba(201,132,122,0.16)" : "rgba(201,132,122,0.03)",
                    border: `1px solid ${selectedNiche === n.id ? "rgba(201,132,122,0.5)" : "rgba(201,132,122,0.12)"}`,
                    borderRadius: 2, padding: "6px 9px", cursor: "pointer",
                    color: selectedNiche === n.id ? ACCENT : "rgba(240,235,227,0.5)",
                    fontSize: 11, textAlign: "left", display: "flex", alignItems: "center", gap: 5,
                    fontFamily: "inherit", transition: "all .15s",
                  }}>
                    <span>{n.emoji}</span><span>{n.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: ACCENT, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 8 }}>Тон</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {TONES.map((t) => (
                  <button key={t.id} onClick={() => setSelectedTone(t.id)} style={{
                    padding: "5px 11px", borderRadius: 2, fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: ".04em",
                    border: `1px solid ${selectedTone === t.id ? "rgba(201,132,122,0.5)" : "rgba(201,132,122,0.16)"}`,
                    background: selectedTone === t.id ? "rgba(201,132,122,0.14)" : "transparent",
                    color: selectedTone === t.id ? ACCENT : "rgba(240,235,227,0.45)",
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {formReady && (
              <div style={{ padding: "9px 12px", background: "rgba(201,132,122,0.07)", border: "1px solid rgba(201,132,122,0.22)", borderRadius: 2, fontSize: 11, color: ACCENT, lineHeight: 1.5 }}>
                Выберите соцсеть справа →
              </div>
            )}
          </div>

          {/* Wire zone */}
          <div ref={wzoneRef} style={{ position: "relative", zIndex: 2, alignSelf: "stretch" }}>
            <svg style={{ position: "absolute", top: 0, left: 0, width: 80, height: "100%", overflow: "visible", pointerEvents: "none" }} viewBox={`0 0 80 ${wzH}`}>
              {SOCIALS.map((s) => {
                const sy = wirePaths[s.id];
                if (sy === undefined) return null;
                const isActive = selectedSocial === s.id;
                return (
                  <path key={s.id}
                    d={`M72,${sy} C44,${sy} 36,${centerY} 8,${centerY}`}
                    fill="none"
                    stroke={isActive ? s.color : "rgba(201,132,122,0.18)"}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeLinecap="round"
                    strokeDasharray={isActive ? undefined : "4 7"}
                  />
                );
              })}
              <circle cx="8" cy={centerY} r="5" fill={selectedSocial ? (socialObj?.color ?? ACCENT) : "rgba(201,132,122,0.3)"} />
              <circle cx="8" cy={centerY} r="9" fill={selectedSocial ? (socialObj?.color ?? ACCENT) : "rgba(201,132,122,0.1)"} opacity=".4" />
            </svg>
            <svg ref={wireSvgRef} xmlns="http://www.w3.org/2000/svg" width="80" style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }} />
          </div>

          {/* Social buttons */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: "24px 16px 24px 10px" }}>
            <div style={{ fontSize: 9, color: "rgba(240,235,227,0.25)", letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 4 }}>Выбери канал</div>
            {SOCIALS.map((s) => {
              const locked = !formReady;
              const isActive = selectedSocial === s.id;
              return (
                <button key={s.id}
                  ref={(el) => { socialRefs.current[s.id] = el; }}
                  onClick={() => handleSocialClick(s)}
                  disabled={locked || wireRunning}
                  style={{
                    position: "relative", width: "100%", padding: "11px 14px", border: "none", borderRadius: 4,
                    cursor: locked ? "not-allowed" : "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 10,
                    opacity: locked ? 0.3 : 1, background: s.bg, color: s.color,
                    boxShadow: `0 5px 0 ${s.shadow},inset 0 1px 0 rgba(255,255,255,.08)`,
                    borderBottom: `4px solid ${s.shadow}`, transition: "opacity .3s", userSelect: "none",
                  }}
                  onMouseDown={(e) => { if (!locked) { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${s.shadow}`; } }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 5px 0 ${s.shadow},inset 0 1px 0 rgba(255,255,255,.08)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 5px 0 ${s.shadow},inset 0 1px 0 rgba(255,255,255,.08)`; }}
                >
                  <span style={{ position: "absolute", left: -11, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: isActive ? s.color : "#0d0820", border: `2px solid ${isActive ? s.color : "rgba(201,132,122,0.3)"}`, boxShadow: isActive ? `0 0 8px ${s.color}80` : "none", transition: "all .3s" }} />
                  <span style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: s.color, opacity: 0.18, borderRadius: 1 }} />
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".04em" }}>{s.name}</div>
                    <div style={{ fontSize: 9, opacity: 0.5, marginTop: 1 }}>{s.sub}</div>
                  </span>
                </button>
              );
            })}
            <button
              onClick={handlePublish}
              disabled={!pubVisible || generating}
              style={{
                marginTop: 8, padding: "11px 14px",
                background: pubVisible ? ACCENT : "rgba(201,132,122,0.06)",
                border: "none", borderRadius: 2,
                color: pubVisible ? "#fff" : "rgba(201,132,122,0.2)",
                fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase",
                cursor: pubVisible ? "pointer" : "not-allowed", fontFamily: "inherit",
                boxShadow: pubVisible ? "0 5px 0 #7a4540,inset 0 1px 0 rgba(255,255,255,.2)" : "none",
                borderBottom: pubVisible ? "4px solid #7a4540" : "none",
                opacity: pubVisible ? 1 : 0, transform: pubVisible ? "none" : "translateY(8px)", transition: "all .35s",
              }}
              onMouseDown={(e) => { if (pubVisible) { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = "0 1px 0 #7a4540"; } }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = pubVisible ? "0 5px 0 #7a4540,inset 0 1px 0 rgba(255,255,255,.2)" : "none"; }}
            >
              {generating ? "Генерирую..." : "ОПУБЛИКОВАТЬ →"}
            </button>
            {pubVisible && !generating && !post && (
              <div style={{ fontSize: 9, color: ACCENT, textAlign: "center", letterSpacing: ".08em" }}>Нажмите выше ↑</div>
            )}
          </div>
        </div>

        {/* Result */}
        {(generating || post) && (
          <div style={{ maxWidth: 940, margin: "20px auto 0", display: "grid", gridTemplateColumns: post ? "1fr 1fr" : "1fr", gap: 20 }}>
            <div>
              {generating ? (
                <div style={{ background: "rgba(26,13,62,.8)", border: "1px solid rgba(201,132,122,0.15)", borderRadius: 4, padding: 48, textAlign: "center", color: ACCENT, fontSize: 13 }}>
                  <div style={{ width: 36, height: 36, border: "2px solid rgba(201,132,122,.2)", borderTop: `2px solid ${ACCENT}`, borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
                  AI генерирует пост...
                </div>
              ) : post ? (
                <PostPreview platform={selectedSocial} post={post} niche={nicheObj} />
              ) : null}
            </div>
            {post && (
              <div style={{ background: "rgba(26,13,62,.8)", border: "1px solid rgba(201,132,122,0.15)", borderRadius: 4, padding: "28px 24px", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
                <div>
                  <div style={{ fontSize: 10, color: ACCENT, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 8 }}>Твой пост готов · {socialObj?.name}</div>
                  <h3 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 22, fontWeight: 300, color: CREAM, letterSpacing: "0.02em", lineHeight: 1.2, marginBottom: 8 }}>{post.title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(240,235,227,0.5)", lineHeight: 1.6 }}>{post.cta}</p>
                </div>
                <div style={{ padding: "12px 14px", background: "rgba(201,132,122,0.06)", border: "1px solid rgba(201,132,122,0.12)", borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: ACCENT, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 6 }}>Текст поста</div>
                  <p style={{ fontSize: 12, color: "rgba(240,235,227,0.7)", lineHeight: 1.65, margin: 0 }}>{post.caption}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "rgba(240,235,227,0.4)", textAlign: "center", marginBottom: 12, lineHeight: 1.5 }}>
                    Хочешь так каждый день?<br />14 дней бесплатно — карта не нужна
                  </p>
                  <button
                    onClick={handleCta} disabled={ctaLoading}
                    style={{ width: "100%", background: ACCENT, border: "none", borderRadius: 2, padding: "13px", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {ctaLoading ? "..." : "Начать бесплатно →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={{ padding: "100px 48px", background: CREAM }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(45,27,78,0.3)", letterSpacing: ".22em", textTransform: "uppercase", marginBottom: 56 }}>
            <span>Возможности</span><span>02</span>
          </div>
          <h2 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "clamp(40px,6vw,72px)", letterSpacing: "0.02em", lineHeight: 1.05, color: PRIMARY, marginBottom: 56 }}>
            Не просто<br />
            <em style={{ color: ACCENT, fontStyle: "italic" }}>автопостинг</em>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, border: "1px solid rgba(45,27,78,0.1)", borderRadius: 2, overflow: "hidden" }}>
            {[
              { icon: "✦", title: "AI-генерация", desc: "Посты, сторис и рекламные тексты за секунды на RU, UZ, EN." },
              { icon: "◈", title: "Умное расписание", desc: "Планируй на неделю вперёд. AI подскажет лучшее время публикации." },
              { icon: "◇", title: "Аналитика", desc: "Охваты, вовлечённость, конверсии — всё в одном дашборде." },
              { icon: "○", title: "Команда", desc: "Приглашай коллег, распределяй роли, управляй доступами." },
              { icon: "△", title: "Все соцсети", desc: "Telegram, Instagram, VK. Один интерфейс для всего." },
              { icon: "□", title: "Автопубликация", desc: "Настрой расписание и забудь. Посты уходят сами." },
            ].map((f, i) => (
              <div key={i}
                style={{ padding: "32px 28px", background: "#fff", borderRight: i % 3 !== 2 ? "1px solid rgba(45,27,78,0.07)" : "none", borderBottom: i < 3 ? "1px solid rgba(45,27,78,0.07)" : "none", transition: "background .2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(201,132,122,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
              >
                <div style={{ fontSize: 22, color: ACCENT, marginBottom: 16, fontWeight: 300 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 8, letterSpacing: "0.01em" }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "rgba(45,27,78,0.5)", lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: MID, padding: "100px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <span style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: WARM, display: "block", marginBottom: 24 }}>
            Начни сегодня
          </span>
          <h2 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "clamp(40px,6vw,68px)", letterSpacing: "0.02em", color: CREAM, lineHeight: 1.1, marginBottom: 20 }}>
            Готов к росту?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(240,235,227,0.55)", lineHeight: 1.7, marginBottom: 44, fontWeight: 300 }}>
            14 дней бесплатно. Карта не нужна. Отмена в любой момент.
          </p>
          <button
            onClick={handleCta} disabled={ctaLoading}
            style={{ background: ACCENT, border: "none", borderRadius: 2, padding: "16px 48px", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#b87269"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ACCENT; }}
          >
            {ctaLoading ? "..." : "Зарегистрироваться →"}
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: PRIMARY, overflow: "hidden" }}>
        <div style={{ padding: "56px 0 36px", overflow: "hidden" }}>
          <div style={{ display: "flex", animation: "marquee 30s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
            {[
              { text: "MVIRA", s: "w" }, { text: "·", s: "d" },
              { text: "AI МАРКЕТИНГ", s: "a" }, { text: "·", s: "d" },
              { text: "АВТОПОСТИНГ", s: "s" }, { text: "·", s: "d" },
              { text: "MVIRA", s: "w" }, { text: "·", s: "d" },
              { text: "AI МАРКЕТИНГ", s: "a" }, { text: "·", s: "d" },
              { text: "АВТОПОСТИНГ", s: "s" }, { text: "·", s: "d" },
            ].map((w, i) => (
              <span key={i} style={{
                paddingRight: 48,
                fontSize: "clamp(44px,7vw,80px)",
                fontWeight: 700, lineHeight: 1, letterSpacing: "-.03em",
                fontFamily: "Cormorant Garamond, Georgia, serif",
                color: w.s === "w" ? CREAM : w.s === "a" ? ACCENT : w.s === "d" ? "rgba(240,235,227,0.1)" : "transparent",
                WebkitTextStroke: w.s === "s" ? "1px rgba(240,235,227,0.2)" : "none",
              }}>
                {w.text}
              </span>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 48px 56px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "end" }}>
          <div>
            <Logo variant="light" size={32} horizontal />
            <p style={{ marginTop: 20, fontSize: 13, color: "rgba(240,235,227,0.35)", lineHeight: 1.7, maxWidth: 320 }}>
              Платформа AI-маркетинга для команд и агентств. Ташкент, Узбекистан.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <button
              onClick={handleCta} disabled={ctaLoading}
              style={{ background: ACCENT, border: "none", borderRadius: 2, padding: "13px 32px", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}
            >
              {ctaLoading ? "..." : "Начать бесплатно →"}
            </button>
            <div style={{ fontSize: 11, color: "rgba(240,235,227,0.2)" }}>Без карты · Без обязательств</div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(240,235,227,0.07)", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "rgba(240,235,227,0.2)", letterSpacing: ".15em", textTransform: "uppercase" }}>
          <span>© 2025 mvira · MVI Digital</span>
          <div style={{ display: "flex", gap: 24 }}>
            <span>Tashkent · UZ</span>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "transparent", border: "none", color: "rgba(240,235,227,0.2)", cursor: "pointer", fontSize: 10, fontFamily: "inherit", letterSpacing: ".15em" }}>
              ↑ НАВЕРХ
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
