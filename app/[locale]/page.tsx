"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

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
const TEAL2 = "#00E8C0";
const INK = "#0C0C0A";

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
  {
    id: "instagram",
    name: "Instagram",
    sub: "@profile",
    color: "#e07090",
    shadow: "#160810",
    bg: "#28101c",
    icon: "◈",
  },
  {
    id: "telegram",
    name: "Telegram",
    sub: "@channel",
    color: "#4db8e8",
    shadow: "#061524",
    bg: "#0d2236",
    icon: "✈",
  },
  {
    id: "vk",
    name: "VK",
    sub: "vk.com/page",
    color: "#5a8ce8",
    shadow: "#060e1e",
    bg: "#0d1a30",
    icon: "⬡",
  },
];

// ─── Canvas: drawn entirely in a single persistent RAF loop ──────────────────
function useNodeCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    interface Pt {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      p: number;
    }
    let W = 0,
      H = 0;
    let rafId = 0;
    let alive = true;

    const N = 55,
      CONN = 130,
      MR = 160;

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pts: Pt[] = Array.from({ length: N }, () => ({
      x: Math.random() * (W || 800),
      y: Math.random() * (H || 500),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 1.8,
      p: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      const mx = mouseRef.current.x,
        my = mouseRef.current.y;

      for (const n of pts) {
        n.x += n.vx;
        n.y += n.vy;
        n.p += 0.018;
        if (n.x < 0) n.x = W;
        if (n.x > W) n.x = 0;
        if (n.y < 0) n.y = H;
        if (n.y > H) n.y = 0;
        const dx = n.x - mx,
          dy = n.y - my,
          d = Math.hypot(dx, dy);
        if (d < MR && d > 0) {
          const f = ((MR - d) / MR) * 0.018;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
          const sp = Math.hypot(n.vx, n.vy);
          if (sp > 0.9) {
            n.vx = (n.vx / sp) * 0.9;
            n.vy = (n.vy / sp) * 0.9;
          }
        }
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i],
            b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < CONN) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,201,167,${(1 - d / CONN) * 0.25})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const n of pts) {
        const p = 0.65 + 0.35 * Math.sin(n.p);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,201,167,${0.04 * p})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,201,167,${0.6 * p})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    },
    [canvasRef],
  );

  const onMouseLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
  }, []);

  return { onMouseMove, onMouseLeave };
}

// ─── Wire pulse animation ─────────────────────────────────────────────────────
function runWirePulse(
  svgEl: SVGSVGElement,
  startY: number,
  endY: number,
  color: string,
  duration: number,
  onDone: () => void,
) {
  const W = 80;
  const H = svgEl.getAttribute("height")
    ? Number(svgEl.getAttribute("height"))
    : 560;
  const x1 = 72,
    y1 = startY,
    x2 = 8,
    y2 = endY;
  const cp1x = x1 - 28,
    cp2x = x2 + 28;
  const tLen = 230,
    dLen = tLen * 0.18;
  let t0: number | null = null;

  const step = (ts: number) => {
    if (!t0) t0 = ts;
    const raw = Math.min((ts - t0) / duration, 1);
    const e = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw;
    const off = tLen - tLen * e;
    const t = e;
    const gx =
      (1 - t) ** 3 * x1 +
      3 * (1 - t) ** 2 * t * cp1x +
      3 * (1 - t) * t ** 2 * cp2x +
      t ** 3 * x2;
    const gy =
      (1 - t) ** 3 * y1 +
      3 * (1 - t) ** 2 * t * y1 +
      3 * (1 - t) * t ** 2 * y2 +
      t ** 3 * y2;

    svgEl.innerHTML = [
      `<path d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="rgba(0,201,167,.09)" stroke-width="6" stroke-linecap="round"/>`,
      `<path d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dLen} ${tLen}" stroke-dashoffset="${off}"/>`,
      `<circle cx="${gx}" cy="${gy}" r="5" fill="${color}"/>`,
      `<circle cx="${gx}" cy="${gy}" r="11" fill="${color}" opacity=".2"/>`,
      `<circle cx="${gx}" cy="${gy}" r="22" fill="${color}" opacity=".07"/>`,
    ].join("");

    if (raw < 1) requestAnimationFrame(step);
    else {
      svgEl.innerHTML = "";
      onDone();
    }
  };
  requestAnimationFrame(step);
}

// ─── Post previews per platform ──────────────────────────────────────────────
function TelegramPreview({
  post,
  niche,
}: {
  post: GeneratedPost;
  niche: (typeof NICHES)[0] | undefined;
}) {
  return (
    <div
      style={{
        background: "#17212b",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(77,184,232,.2)",
      }}
    >
      {/* TG header */}
      <div
        style={{
          background: "#232e3c",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(77,184,232,.1)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#2b5278",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {niche?.emoji ?? "🚀"}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            {niche?.label ?? "Channel"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>
            1 248 подписчиков
          </div>
        </div>
        <span style={{ marginLeft: "auto", color: "#4db8e8", fontSize: 13 }}>
          ···
        </span>
      </div>
      {/* message bubble */}
      <div style={{ padding: "14px" }}>
        <div
          style={{
            background: "#182533",
            borderRadius: "4px 12px 12px 12px",
            padding: "12px 14px",
            maxWidth: "90%",
            borderLeft: "3px solid #4db8e8",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#e8f5f2",
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            <strong style={{ color: "#4db8e8" }}>{post.hook}</strong>
            <br />
            <br />
            {post.caption}
          </div>
          {post.hashtags?.length > 0 && (
            <div style={{ fontSize: 11, color: "#4db8e8", lineHeight: 1.6 }}>
              {post.hashtags.map((h) => `#${h}`).join(" ")}
            </div>
          )}
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,.3)",
              marginTop: 8,
              textAlign: "right",
            }}
          >
            14:32 ✓✓
          </div>
        </div>
        {/* reactions */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {["👍 48", "🔥 22", "❤️ 15"].map((r) => (
            <span
              key={r}
              style={{
                background: "rgba(77,184,232,.1)",
                border: "1px solid rgba(77,184,232,.2)",
                borderRadius: 20,
                padding: "3px 8px",
                fontSize: 11,
                color: "#4db8e8",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({
  post,
  niche,
}: {
  post: GeneratedPost;
  niche: (typeof NICHES)[0] | undefined;
}) {
  return (
    <div
      style={{
        background: "#0a1210",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(224,112,144,.2)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            flexShrink: 0,
            background:
              "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#bc1888)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {niche?.emoji ?? "🚀"}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e8f5f2" }}>
            {niche?.label ?? "brand"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(232,245,242,.35)",
              marginTop: 1,
            }}
          >
            только что
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            color: "rgba(232,245,242,.3)",
            fontSize: 16,
          }}
        >
          ···
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 180,
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg,#061410,#0a2e28,#062018,#040e0a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 50% 50% at 30% 40%, rgba(224,112,144,.15), transparent 60%)",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "rgba(224,112,144,.35)",
            letterSpacing: ".12em",
            position: "relative",
          }}
        >
          AI · IMAGE
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "10px 14px 4px",
          fontSize: 18,
          color: "#e8f5f2",
        }}
      >
        <span>♡</span>
        <span>💬</span>
        <span>✈</span>
        <span style={{ marginLeft: "auto" }}>🔖</span>
      </div>
      <div
        style={{
          padding: "0 14px 5px",
          fontSize: 12,
          fontWeight: 600,
          color: "#e8f5f2",
        }}
      >
        1 248 отметок «Нравится»
      </div>
      <div
        style={{
          padding: "0 14px 6px",
          fontSize: 12,
          lineHeight: 1.55,
          color: "#e8f5f2",
        }}
      >
        <strong style={{ fontWeight: 600 }}>
          {niche?.label.toLowerCase().replace(/\s/g, "_") ?? "brand"}
        </strong>{" "}
        {post.hook}
      </div>
      {post.hashtags?.length > 0 && (
        <div
          style={{
            padding: "0 14px 8px",
            fontSize: 11,
            color: TEAL,
            lineHeight: 1.6,
          }}
        >
          {post.hashtags.map((h) => `#${h}`).join(" ")}
        </div>
      )}
      <div
        style={{
          padding: "0 14px 12px",
          fontSize: 10,
          color: "rgba(232,245,242,.3)",
          letterSpacing: ".05em",
        }}
      >
        2 минуты назад
      </div>
    </div>
  );
}

function VKPreview({
  post,
  niche,
}: {
  post: GeneratedPost;
  niche: (typeof NICHES)[0] | undefined;
}) {
  return (
    <div
      style={{
        background: "#1a1f2e",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(90,140,232,.2)",
      }}
    >
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid rgba(90,140,232,.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#2a3550",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {niche?.emoji ?? "🚀"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f0ff" }}>
              {niche?.label ?? "Сообщество"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(232,240,255,.35)" }}>
              только что
            </div>
          </div>
          <span style={{ marginLeft: "auto", color: "#5a8ce8", fontSize: 18 }}>
            ···
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#e8f0ff",
            lineHeight: 1.6,
            marginBottom: 10,
          }}
        >
          {post.hook}
          <br />
          <br />
          {post.caption}
        </div>
        {/* image placeholder */}
        <div
          style={{
            width: "100%",
            height: 150,
            borderRadius: 8,
            background: "linear-gradient(135deg,#0d1525,#1a2a50,#0d1a35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 50% 50% at 40% 40%, rgba(90,140,232,.15), transparent 60%)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(90,140,232,.4)",
              letterSpacing: ".12em",
              position: "relative",
            }}
          >
            AI · IMAGE
          </span>
        </div>
      </div>
      {/* reactions */}
      <div
        style={{
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {[
          ["❤️", "312"],
          ["💬", "48"],
          ["↗", "94"],
        ].map(([icon, cnt]) => (
          <span
            key={icon}
            style={{
              fontSize: 12,
              color: "rgba(232,240,255,.45)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{icon}</span>
            <span>{cnt}</span>
          </span>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "rgba(90,140,232,.5)",
          }}
        >
          Поделиться
        </span>
      </div>
    </div>
  );
}

function PostPreview({
  platform,
  post,
  niche,
}: {
  platform: string | null;
  post: GeneratedPost;
  niche: (typeof NICHES)[0] | undefined;
}) {
  if (platform === "telegram")
    return <TelegramPreview post={post} niche={niche} />;
  if (platform === "vk") return <VKPreview post={post} niche={niche} />;
  return <InstagramPreview post={post} niche={niche} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

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
  const [googleLoading, setGoogleLoading] = useState(false);

  // static wire paths — recalculated after mount/resize
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

  // recalc after mount and on resize
  useEffect(() => {
    // small delay so buttons are measured after paint
    const t = setTimeout(calcWirePaths, 100);
    window.addEventListener("resize", calcWirePaths);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calcWirePaths);
    };
  }, [calcWirePaths]);

  // unlock socials when niche picked
  useEffect(() => {
    if (selectedNiche && !formReady) setFormReady(true);
  }, [selectedNiche, formReady]);

  const handleSocialClick = useCallback(
    (s: (typeof SOCIALS)[0]) => {
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

      // set svg height
      svg.setAttribute("height", String(wzone.offsetHeight));

      runWirePulse(svg, startY, endY, s.color, 1800, () => {
        setWireRunning(false);
        setPubVisible(true);
      });
    },
    [formReady, wireRunning],
  );

  const handlePublish = async () => {
    if (!selectedNiche || !selectedSocial) return;
    setGenerating(true);
    setPost(null);
    try {
      const res = await fetch("/api/demo-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: selectedNiche,
          tone: selectedTone,
          platform: selectedSocial,
        }),
      });
      setPost(await res.json());
    } catch {
      setPost(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
  };

  const nicheObj = NICHES.find((n) => n.id === selectedNiche);
  const socialObj = SOCIALS.find((s) => s.id === selectedSocial);
  const wzH = wzoneRef.current?.offsetHeight ?? 560;
  const centerY = wzH / 2;

  return (
    <div
      style={{ fontFamily: "Inter,system-ui,sans-serif", overflowX: "hidden" }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 48px",
          borderBottom: "1px solid rgba(26,26,24,.08)",
          background: "rgba(248,248,246,.94)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: INK }}>
          Post<span style={{ color: TEAL }}>Centro</span>
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push(`/${locale}/auth/login`)}
            style={{
              background: "transparent",
              border: "1px solid rgba(26,26,24,.15)",
              color: "rgba(26,26,24,.6)",
              padding: "7px 18px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Войти
          </button>
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              background: INK,
              border: "none",
              color: "#fff",
              padding: "7px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 3px 0 rgba(0,0,0,.35)",
            }}
          >
            {googleLoading ? "..." : "Начать бесплатно"}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          background: "#f8f8f6",
          textAlign: "center",
          padding: "100px 48px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* bg marquee */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            transform: "translateY(-50%)",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              animation: "marquee 24s linear infinite",
              whiteSpace: "nowrap",
              width: "max-content",
              fontSize: 130,
              fontWeight: 700,
              letterSpacing: "-.04em",
              color: "rgba(26,26,24,.04)",
              lineHeight: 1,
            }}
          >
            {[
              "POSTCENTRO",
              "·",
              "AI",
              "·",
              "МАРКЕТИНГ",
              "·",
              "POSTCENTRO",
              "·",
              "AI",
              "·",
              "МАРКЕТИНГ",
              "·",
            ].map((w, i) => (
              <span key={i} style={{ paddingRight: 60 }}>
                {w}
              </span>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,201,167,.1)",
              border: "1px solid rgba(0,201,167,.3)",
              color: "#007a65",
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 11,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: TEAL,
                animation: "tealPulse 2s infinite",
                display: "inline-block",
              }}
            />
            AI-powered автопостинг
          </div>

          <h1
            style={{
              fontSize: "clamp(52px,9vw,110px)",
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: "-.04em",
              color: INK,
              marginBottom: 24,
            }}
          >
            Один клик —<br />
            <span style={{ color: TEAL }}>тысячи охватов</span>
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "rgba(26,26,24,.5)",
              maxWidth: 520,
              margin: "0 auto 40px",
              lineHeight: 1.65,
            }}
          >
            Создавай и публикуй контент в Telegram, Instagram и VK с помощью AI.
            Попробуй прямо сейчас — без регистрации.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={() =>
                document
                  .getElementById("demo")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                background: INK,
                border: "none",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 5px 0 rgba(0,0,0,.3)",
                letterSpacing: ".03em",
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(4px)";
                e.currentTarget.style.boxShadow = "0 1px 0 rgba(0,0,0,.3)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 5px 0 rgba(0,0,0,.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 5px 0 rgba(0,0,0,.3)";
              }}
            >
              Попробовать бесплатно →
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("about")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                background: "transparent",
                border: "1px solid rgba(26,26,24,.2)",
                color: "rgba(26,26,24,.6)",
                padding: "14px 32px",
                borderRadius: 10,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Как это работает
            </button>
          </div>
          <p
            style={{
              marginTop: 16,
              fontSize: 11,
              color: "rgba(26,26,24,.3)",
              letterSpacing: ".1em",
            }}
          >
            БЕЗ РЕГИСТРАЦИИ · БЕСПЛАТНО · 30 СЕКУНД
          </p>
        </div>
      </section>

      {/* ── STRIP ── */}
      <div
        style={{
          overflow: "hidden",
          borderTop: "1px solid rgba(26,26,24,.06)",
          borderBottom: "1px solid rgba(26,26,24,.06)",
          padding: "12px 0",
          background: "#f0ede8",
        }}
      >
        <div
          style={{
            display: "flex",
            animation: "marquee 20s linear infinite",
            whiteSpace: "nowrap",
            width: "max-content",
          }}
        >
          {[
            "INSTAGRAM",
            "·",
            "TELEGRAM",
            "·",
            "VK",
            "·",
            "AI CONTENT",
            "·",
            "АВТОПОСТИНГ",
            "·",
            "АНАЛИТИКА",
            "·",
            "МАРКЕТИНГ",
            "·",
            "INSTAGRAM",
            "·",
            "TELEGRAM",
            "·",
            "VK",
            "·",
            "AI CONTENT",
            "·",
            "АВТОПОСТИНГ",
            "·",
            "АНАЛИТИКА",
            "·",
            "МАРКЕТИНГ",
            "·",
          ].map((w, i) => (
            <span
              key={i}
              style={{
                paddingRight: 36,
                fontSize: 11,
                letterSpacing: ".22em",
                color: w === "·" ? "rgba(26,26,24,.2)" : "rgba(26,26,24,.35)",
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* ══ DEMO (тёмный) ══════════════════════════════════════════════════════ */}
      <section
        id="demo"
        style={{ padding: "80px 24px", background: "#060D0D" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              color: TEAL,
              letterSpacing: ".25em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Живое демо
          </div>
          <h2
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "#e8f5f2",
              marginBottom: 10,
            }}
          >
            Попробуй прямо здесь
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(232,245,242,.4)",
              maxWidth: 460,
              margin: "0 auto",
            }}
          >
            Выбери нишу и тон — AI сгенерирует пост. Выбери соцсеть и опубликуй.
          </p>
        </div>

        {/* ── Stage ── */}
        <div
          ref={stageRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{
            position: "relative",
            maxWidth: 940,
            margin: "0 auto",
            minHeight: 560,
            borderRadius: 20,
            border: "1px solid rgba(0,201,167,.12)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 80px 220px",
            alignItems: "stretch",
          }}
        >
          {/* Canvas BG */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
          {/* Vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 25%, rgba(6,13,13,.65) 100%)",
            }}
          />

          {/* ── Glass Form ── */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              margin: 24,
              padding: "26px 22px",
              background: "rgba(6,20,18,.78)",
              border: "1px solid rgba(0,201,167,.16)",
              borderRadius: 18,
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              boxShadow:
                "0 0 0 1px rgba(0,201,167,.05),0 24px 48px rgba(0,0,0,.5),inset 0 1px 0 rgba(0,201,167,.1)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f5f2" }}>
                Создать пост с AI
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(0,201,167,.5)",
                  marginTop: 3,
                }}
              >
                Без регистрации · виртуальный канал
              </div>
            </div>

            {/* Niche grid */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: TEAL,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  marginBottom: 9,
                }}
              >
                Выберите нишу
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 5,
                }}
              >
                {NICHES.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNiche(n.id)}
                    style={{
                      background:
                        selectedNiche === n.id
                          ? "rgba(0,201,167,.14)"
                          : "rgba(0,201,167,.03)",
                      border: `1px solid ${selectedNiche === n.id ? "rgba(0,201,167,.5)" : "rgba(0,201,167,.1)"}`,
                      borderRadius: 8,
                      padding: "6px 9px",
                      cursor: "pointer",
                      color:
                        selectedNiche === n.id ? TEAL2 : "rgba(232,245,242,.5)",
                      fontSize: 11,
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontFamily: "inherit",
                      transition: "all .15s",
                    }}
                  >
                    <span>{n.emoji}</span>
                    <span>{n.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: TEAL,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Тон
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTone(t.id)}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: ".04em",
                      border: `1px solid ${selectedTone === t.id ? "rgba(0,201,167,.5)" : "rgba(0,201,167,.14)"}`,
                      background:
                        selectedTone === t.id
                          ? "rgba(0,201,167,.12)"
                          : "transparent",
                      color:
                        selectedTone === t.id ? TEAL : "rgba(232,245,242,.45)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {formReady && (
              <div
                style={{
                  padding: "9px 12px",
                  background: "rgba(0,201,167,.06)",
                  border: "1px solid rgba(0,201,167,.2)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: TEAL,
                  lineHeight: 1.5,
                }}
              >
                Выберите соцсеть справа →
              </div>
            )}
          </div>

          {/* ── Wire zone ── */}
          <div
            ref={wzoneRef}
            style={{ position: "relative", zIndex: 2, alignSelf: "stretch" }}
          >
            {/* Static wires — always visible */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 80,
                height: "100%",
                overflow: "visible",
                pointerEvents: "none",
              }}
              viewBox={`0 0 80 ${wzH}`}
            >
              {SOCIALS.map((s) => {
                const sy = wirePaths[s.id];
                if (sy === undefined) return null;
                const isActive = selectedSocial === s.id;
                return (
                  <path
                    key={s.id}
                    d={`M72,${sy} C44,${sy} 36,${centerY} 8,${centerY}`}
                    fill="none"
                    stroke={isActive ? s.color : "rgba(0,201,167,.18)"}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeLinecap="round"
                    strokeDasharray={isActive ? undefined : "4 7"}
                  />
                );
              })}
              {/* Center dot */}
              <circle
                cx="8"
                cy={centerY}
                r="5"
                fill={
                  selectedSocial
                    ? (socialObj?.color ?? TEAL)
                    : "rgba(0,201,167,.3)"
                }
              />
              <circle
                cx="8"
                cy={centerY}
                r="9"
                fill={
                  selectedSocial
                    ? (socialObj?.color ?? TEAL)
                    : "rgba(0,201,167,.1)"
                }
                opacity=".4"
              />
            </svg>

            {/* Animated pulse wire */}
            <svg
              ref={wireSvgRef}
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                overflow: "visible",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* ── Social Buttons ── */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10,
              padding: "24px 16px 24px 10px",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "rgba(232,245,242,.25)",
                letterSpacing: ".2em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Выбери канал
            </div>

            {SOCIALS.map((s) => {
              const locked = !formReady;
              const isActive = selectedSocial === s.id;
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    socialRefs.current[s.id] = el;
                  }}
                  onClick={() => handleSocialClick(s)}
                  disabled={locked || wireRunning}
                  style={{
                    position: "relative",
                    width: "100%",
                    padding: "11px 14px",
                    border: "none",
                    borderRadius: 10,
                    cursor: locked ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: locked ? 0.3 : 1,
                    background: s.bg,
                    color: s.color,
                    boxShadow: `0 5px 0 ${s.shadow},inset 0 1px 0 rgba(255,255,255,.08)`,
                    borderBottom: `4px solid ${s.shadow}`,
                    transition: "opacity .3s",
                    userSelect: "none",
                  }}
                  onMouseDown={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "translateY(4px)";
                      e.currentTarget.style.boxShadow = `0 1px 0 ${s.shadow}`;
                    }
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = `0 5px 0 ${s.shadow},inset 0 1px 0 rgba(255,255,255,.08)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = `0 5px 0 ${s.shadow},inset 0 1px 0 rgba(255,255,255,.08)`;
                  }}
                >
                  {/* connector dot */}
                  <span
                    style={{
                      position: "absolute",
                      left: -11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isActive ? s.color : "#060D0D",
                      border: `2px solid ${isActive ? s.color : "rgba(0,201,167,.3)"}`,
                      boxShadow: isActive ? `0 0 8px ${s.color}80` : "none",
                      transition: "all .3s",
                    }}
                  />
                  {/* top highlight stripe */}
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "10%",
                      right: "10%",
                      height: 1,
                      background: s.color,
                      opacity: 0.18,
                      borderRadius: 1,
                    }}
                  />
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: ".04em",
                      }}
                    >
                      {s.name}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.5, marginTop: 1 }}>
                      {s.sub}
                    </div>
                  </span>
                </button>
              );
            })}

            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={!pubVisible || generating}
              style={{
                marginTop: 8,
                padding: "11px 14px",
                background: pubVisible ? TEAL : "rgba(0,201,167,.06)",
                border: "none",
                borderRadius: 10,
                color: pubVisible ? "#060D0D" : "rgba(0,201,167,.2)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: pubVisible ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                boxShadow: pubVisible
                  ? `0 5px 0 #005544,inset 0 1px 0 rgba(255,255,255,.2)`
                  : "none",
                borderBottom: pubVisible ? "4px solid #005544" : "none",
                opacity: pubVisible ? 1 : 0,
                transform: pubVisible ? "none" : "translateY(8px)",
                transition: "all .35s",
              }}
              onMouseDown={(e) => {
                if (pubVisible) {
                  e.currentTarget.style.transform = "translateY(4px)";
                  e.currentTarget.style.boxShadow = "0 1px 0 #005544";
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = pubVisible
                  ? `0 5px 0 #005544,inset 0 1px 0 rgba(255,255,255,.2)`
                  : "none";
              }}
            >
              {generating ? "Генерирую..." : "ОПУБЛИКОВАТЬ →"}
            </button>

            {pubVisible && !generating && !post && (
              <div
                style={{
                  fontSize: 9,
                  color: TEAL,
                  textAlign: "center",
                  letterSpacing: ".08em",
                }}
              >
                Нажмите выше ↑
              </div>
            )}
          </div>
        </div>

        {/* ── Result under stage ── */}
        {(generating || post) && (
          <div
            style={{
              maxWidth: 940,
              margin: "20px auto 0",
              display: "grid",
              gridTemplateColumns: post ? "1fr 1fr" : "1fr",
              gap: 20,
            }}
          >
            {/* Preview */}
            <div>
              {generating ? (
                <div
                  style={{
                    background: "rgba(6,20,18,.8)",
                    border: "1px solid rgba(0,201,167,.15)",
                    borderRadius: 20,
                    padding: 48,
                    textAlign: "center",
                    color: TEAL,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      border: `2px solid rgba(0,201,167,.2)`,
                      borderTop: `2px solid ${TEAL}`,
                      borderRadius: "50%",
                      animation: "spin .8s linear infinite",
                      margin: "0 auto 16px",
                    }}
                  />
                  AI генерирует пост...
                </div>
              ) : post ? (
                <PostPreview
                  platform={selectedSocial}
                  post={post}
                  niche={nicheObj}
                />
              ) : null}
            </div>

            {/* CTA */}
            {post && (
              <div
                style={{
                  background: "rgba(6,20,18,.8)",
                  border: "1px solid rgba(0,201,167,.15)",
                  borderRadius: 20,
                  padding: "28px 24px",
                  backdropFilter: "blur(20px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEAL,
                      letterSpacing: ".15em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Твой пост готов · {socialObj?.name}
                  </div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#e8f5f2",
                      letterSpacing: "-.02em",
                      lineHeight: 1.2,
                      marginBottom: 8,
                    }}
                  >
                    {post.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(232,245,242,.5)",
                      lineHeight: 1.6,
                    }}
                  >
                    {post.cta}
                  </p>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(0,201,167,.05)",
                    border: "1px solid rgba(0,201,167,.1)",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: TEAL,
                      letterSpacing: ".15em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Текст поста
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(232,245,242,.7)",
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {post.caption}
                  </p>
                </div>

                <div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(232,245,242,.4)",
                      textAlign: "center",
                      marginBottom: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Хочешь так каждый день?
                    <br />
                    14 дней бесплатно — карта не нужна
                  </p>
                  <button
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    style={{
                      width: "100%",
                      background: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#111",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontFamily: "inherit",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {googleLoading ? "Загрузка..." : "Войти через Google"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── ABOUT (светлый) ── */}
      <section
        id="about"
        style={{ padding: "100px 48px", background: "#f8f8f6" }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "rgba(26,26,24,.3)",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              marginBottom: 48,
            }}
          >
            <span>Возможности</span>
            <span>02</span>
          </div>
          <h2
            style={{
              fontSize: "clamp(36px,6vw,72px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              lineHeight: 0.95,
              color: INK,
              marginBottom: 48,
            }}
          >
            Не просто
            <br />
            <span style={{ color: TEAL }}>автопостинг</span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 1,
              border: "1px solid rgba(26,26,24,.08)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {[
              {
                icon: "🤖",
                title: "AI-генерация",
                desc: "Посты, сторис и рекламные тексты за секунды на RU, UZ, EN.",
              },
              {
                icon: "📅",
                title: "Умное расписание",
                desc: "Планируй на неделю вперёд. AI подскажет лучшее время.",
              },
              {
                icon: "📊",
                title: "Аналитика",
                desc: "Охваты, вовлечённость, конверсии — всё в одном дашборде.",
              },
              {
                icon: "👥",
                title: "Команда",
                desc: "Приглашай коллег, распределяй роли, управляй доступами.",
              },
              {
                icon: "🔗",
                title: "Все соцсети",
                desc: "Telegram, Instagram, VK. Один интерфейс для всего.",
              },
              {
                icon: "⚡",
                title: "Автопубликация",
                desc: "Настрой расписание и забудь. Посты уходят сами.",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "28px 24px",
                  background: "#fff",
                  borderRight:
                    i % 3 !== 2 ? "1px solid rgba(26,26,24,.06)" : "none",
                  borderBottom: i < 3 ? "1px solid rgba(26,26,24,.06)" : "none",
                  transition: "background .2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f0ede8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: INK,
                    marginBottom: 8,
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(26,26,24,.5)",
                    lineHeight: 1.6,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER (тёмный) ── */}
      <footer style={{ background: INK, overflow: "hidden" }}>
        <div style={{ padding: "60px 0 40px", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              animation: "marquee 28s linear infinite",
              whiteSpace: "nowrap",
              width: "max-content",
            }}
          >
            {[
              { text: "POSTCENTRO", s: "w" },
              { text: "·", s: "d" },
              { text: "AI МАРКЕТИНГ", s: "s" },
              { text: "·", s: "d" },
              { text: "АВТОПОСТИНГ", s: "t" },
              { text: "·", s: "d" },
              { text: "POSTCENTRO", s: "w" },
              { text: "·", s: "d" },
              { text: "AI МАРКЕТИНГ", s: "s" },
              { text: "·", s: "d" },
              { text: "АВТОПОСТИНГ", s: "t" },
              { text: "·", s: "d" },
            ].map((w, i) => (
              <span
                key={i}
                style={{
                  paddingRight: 48,
                  fontSize: "clamp(48px,8vw,90px)",
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-.03em",
                  color:
                    w.s === "w"
                      ? "#fff"
                      : w.s === "t"
                        ? TEAL
                        : w.s === "d"
                          ? "rgba(255,255,255,.15)"
                          : "transparent",
                  WebkitTextStroke:
                    w.s === "s" ? "1px rgba(255,255,255,.25)" : "none",
                }}
              >
                {w.text}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "40px 48px 60px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "end",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,.3)",
                letterSpacing: ".2em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Начни сегодня
            </div>
            <h3
              style={{
                fontSize: "clamp(24px,4vw,40px)",
                fontWeight: 700,
                letterSpacing: "-.02em",
                lineHeight: 1.15,
                color: "#fff",
                marginBottom: 16,
              }}
            >
              Готов к росту?
              <br />
              <span style={{ color: TEAL }}>Попробуй бесплатно</span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: TEAL,
                  animation: "tealPulse 2s infinite",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: TEAL,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                14 дней бесплатно
              </span>
            </div>
          </div>
          <div>
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              style={{
                width: "100%",
                background: TEAL,
                border: "none",
                borderRadius: 12,
                padding: "16px",
                fontSize: 15,
                fontWeight: 700,
                color: INK,
                cursor: "pointer",
                letterSpacing: ".04em",
                fontFamily: "inherit",
                boxShadow: "0 5px 0 #005544",
                marginBottom: 12,
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(4px)";
                e.currentTarget.style.boxShadow = "0 1px 0 #005544";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 5px 0 #005544";
              }}
            >
              {googleLoading ? "..." : "Начать бесплатно →"}
            </button>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,.25)",
                textAlign: "center",
                letterSpacing: ".05em",
              }}
            >
              Карта не нужна · Без обязательств
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,.06)",
            padding: "16px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10,
            color: "rgba(255,255,255,.25)",
            letterSpacing: ".15em",
            textTransform: "uppercase",
          }}
        >
          <span>© 2025 PostCentro · MVI Digital</span>
          <div style={{ display: "flex", gap: 24 }}>
            <span>Tashkent · UZ</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,.25)",
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "inherit",
                letterSpacing: ".15em",
              }}
            >
              ↑ НАВЕРХ
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes tealPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes marquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
