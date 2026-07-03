"use client";
import { useState } from "react";

// ── Block types ───────────────────────────────────────────────────────────────
export type HeroBlock = {
  type: "hero";
  badge?: string;
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  cta?: string;
  visual?: string;
  emoji?: string;
  centered?: boolean;
};

export type SocialProofBlock = {
  type: "social_proof";
  stats?: { value: string; label: string }[];
  note?: string;
};

export type BenefitsBlock = {
  type: "benefits";
  title?: string;
  subtitle?: string;
  items?: { icon?: string; title: string; desc?: string }[];
};

// Legacy alias — renders identically to BenefitsBlock
export type FeaturesBlock = {
  type: "features";
  title?: string;
  subtitle?: string;
  items?: { icon?: string; title: string; desc?: string }[];
};

export type ShowcaseBlock = {
  type: "showcase";
  title?: string;
  subtitle?: string;
  items?: { icon?: string; title: string; desc?: string; badge?: string }[];
};

export type PriceBlock = {
  type: "price";
  title?: string;
  oldPrice?: string;
  newPrice: string;
  features?: string[];
  cta?: string;
  badge?: string;
  emoji?: string;
};

export type FormBlock = {
  type: "form";
  title?: string;
  subtitle?: string;
  button?: string;
  dark?: boolean;
  note?: string;
};

export type FaqBlock = {
  type: "faq";
  title?: string;
  items?: { q: string; a: string }[];
};

export type CtaBlock = {
  type: "cta";
  title?: string;
  subtitle?: string;
  cta?: string;
  note?: string;
};

export type TextBlock = {
  type: "text";
  title?: string;
  body?: string;
};

export type Block =
  | HeroBlock | SocialProofBlock | BenefitsBlock | FeaturesBlock
  | ShowcaseBlock | PriceBlock | FormBlock | FaqBlock | CtaBlock | TextBlock;

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  blocks: Block[];
  bgImage?: string;
  brandColor?: string;
  onLeadSubmit?: (data: { name: string; phone: string }) => Promise<void>;
  preview?: boolean;
  // legacy compat
  selectedIndex?: number | null;
  onSelectBlock?: (index: number) => void;
};

// ── FAQ accordion item ────────────────────────────────────────────────────────
function FaqItem({ q, a, accent, preview }: { q: string; a: string; accent: string; preview: boolean }) {
  const [open, setOpen] = useState(false);
  const fs = preview ? 11 : 16;
  return (
    <div style={{ borderBottom: "1px solid #E2E8F0" }}>
      <button
        onClick={() => !preview && setOpen(o => !o)}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          width: "100%", textAlign: "left", padding: preview ? "10px 0" : "20px 0",
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: fs, fontWeight: 500, color: "#0F172A", lineHeight: 1.45, paddingRight: 12 }}>
          {q}
        </span>
        <span style={{ fontSize: preview ? 14 : 22, color: open ? accent : "#CBD5E1", transition: "transform 0.2s, color 0.2s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0 }}>
          +
        </span>
      </button>
      {(open || preview) && (
        <p style={{ fontSize: preview ? 10 : 15, color: "#64748B", lineHeight: 1.65, paddingBottom: preview ? 8 : 20 }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ── Renderer ──────────────────────────────────────────────────────────────────
export default function LandingRenderer({
  blocks, bgImage, brandColor = "#4F46E5",
  onLeadSubmit, preview = false,
}: Props) {
  const [lead, setLead] = useState({ name: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const accent = brandColor;

  // Size helper: full vs preview
  const px = <T extends string | number>(full: T, prev: T): T => (preview ? prev : full);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLeadSubmit || submitting) return;
    setSubmitting(true);
    try { await onLeadSubmit(lead); setSubmitted(true); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{
      background: bgImage ? `url(${bgImage}) center/cover no-repeat` : "#FFFFFF",
      fontFamily: "'Inter','SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",
      color: "#0F172A",
      lineHeight: 1.5,
    }}>
      {blocks.map((block, i) => {

        // ── Hero ─────────────────────────────────────────────────────────────
        if (block.type === "hero") {
          const visual = block.visual || block.emoji || "✨";
          return (
            <section key={i} style={{ background: "#FFFFFF", padding: px("80px 0", "36px 0") }}>
              <div style={{ maxWidth: 1100, margin: "0 auto", padding: px("0 40px", "0 18px") }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: preview ? "1fr" : "1fr minmax(0, 440px)",
                  gap: px(64, 0),
                  alignItems: "center",
                }}>
                  {/* Left: text */}
                  <div>
                    {(block.badge || block.eyebrow) && (
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        background: `${accent}14`, color: accent,
                        fontSize: px(12, 10), fontWeight: 600,
                        padding: px("5px 14px", "4px 10px"), borderRadius: 40,
                        marginBottom: px(22, 12), letterSpacing: "0.01em",
                      }}>
                        {block.badge || block.eyebrow}
                      </span>
                    )}
                    <h1 style={{
                      fontSize: px(62, 26), fontWeight: 800, lineHeight: 1.08,
                      color: "#0F172A", letterSpacing: "-0.03em",
                      marginBottom: px(18, 10),
                    }}>
                      {block.headline}
                    </h1>
                    {block.subheadline && (
                      <p style={{
                        fontSize: px(18, 13), color: "#64748B", lineHeight: 1.65,
                        marginBottom: px(32, 18), maxWidth: 520,
                      }}>
                        {block.subheadline}
                      </p>
                    )}
                    {block.cta && (
                      <a href="#form" style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        background: accent, color: "#fff",
                        padding: px("0 28px", "0 18px"),
                        height: px(52, 38),
                        borderRadius: px(14, 10),
                        fontWeight: 600, fontSize: px(15, 12),
                        textDecoration: "none",
                        boxShadow: `0 4px 16px ${accent}38`,
                        letterSpacing: "-0.01em",
                      }}>
                        {block.cta}
                        <svg width={px(14, 10)} height={px(14, 10)} viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </a>
                    )}
                  </div>

                  {/* Right: visual card (desktop only) */}
                  {!preview && (
                    <div style={{
                      background: "linear-gradient(145deg, #F8FAFC 0%, #EEF2FF 100%)",
                      border: "1px solid #E2E8F0",
                      borderRadius: 24, overflow: "hidden",
                      aspectRatio: "4/3",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative",
                    }}>
                      {/* Deco circles */}
                      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: `${accent}10`, top: -60, right: -40 }} />
                      <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: `${accent}08`, bottom: -20, left: 20 }} />
                      <span style={{ fontSize: 80, position: "relative", zIndex: 1, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.08))" }}>
                        {visual}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // ── Social Proof ──────────────────────────────────────────────────────
        if (block.type === "social_proof") {
          const stats = block.stats ?? [];
          return (
            <section key={i} style={{
              background: "#F8FAFC",
              borderTop: "1px solid #E2E8F0",
              borderBottom: "1px solid #E2E8F0",
              padding: px("28px 40px", "16px 18px"),
            }}>
              <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 0 }}>
                {stats.map((s, j) => (
                  <div key={j} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: px("6px 40px", "4px 18px"),
                    borderRight: j < stats.length - 1 ? "1px solid #E2E8F0" : "none",
                  }}>
                    <span style={{ fontSize: px(26, 16), fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>{s.value}</span>
                    <span style={{ fontSize: px(13, 9), color: "#94A3B8", marginTop: 2 }}>{s.label}</span>
                  </div>
                ))}
                {block.note && (
                  <p style={{ width: "100%", textAlign: "center", fontSize: px(13, 10), color: "#94A3B8", marginTop: stats.length ? px(10, 6) : 0 }}>
                    {block.note}
                  </p>
                )}
              </div>
            </section>
          );
        }

        // ── Benefits / Features ───────────────────────────────────────────────
        if (block.type === "benefits" || block.type === "features") {
          const items = block.items ?? [];
          const cols = items.length <= 2 ? 2 : items.length >= 4 ? 4 : 3;
          return (
            <section key={i} style={{ background: "#FFFFFF", padding: px("96px 40px", "40px 18px") }}>
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                {block.title && (
                  <div style={{ textAlign: "center", marginBottom: px(48, 22) }}>
                    <h2 style={{ fontSize: px(40, 20), fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em", marginBottom: px(12, 6) }}>
                      {block.title}
                    </h2>
                    {(block as BenefitsBlock).subtitle && (
                      <p style={{ fontSize: px(17, 12), color: "#64748B", maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>
                        {(block as BenefitsBlock).subtitle}
                      </p>
                    )}
                  </div>
                )}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: preview
                    ? "repeat(2, 1fr)"
                    : `repeat(${Math.min(cols, 3)}, 1fr)`,
                  gap: px(16, 8),
                }}>
                  {items.map((item, j) => (
                    <div key={j} style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: px(16, 9),
                      padding: px("24px 22px", "12px 10px"),
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                      {item.icon && (
                        <div style={{ fontSize: px(26, 14), marginBottom: px(12, 6) }}>{item.icon}</div>
                      )}
                      <h3 style={{ fontSize: px(15, 10), fontWeight: 600, color: "#0F172A", marginBottom: px(6, 3) }}>
                        {item.title}
                      </h3>
                      {item.desc && (
                        <p style={{ fontSize: px(13, 9), color: "#64748B", lineHeight: 1.6 }}>{item.desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        // ── Showcase ──────────────────────────────────────────────────────────
        if (block.type === "showcase") {
          const items = (block.items ?? []).slice(0, 4);
          return (
            <section key={i} style={{ background: "#F8FAFC", padding: px("96px 40px", "40px 18px") }}>
              <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                {block.title && (
                  <div style={{ textAlign: "center", marginBottom: px(48, 22) }}>
                    <h2 style={{ fontSize: px(40, 20), fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em", marginBottom: px(12, 6) }}>
                      {block.title}
                    </h2>
                    {block.subtitle && (
                      <p style={{ fontSize: px(17, 12), color: "#64748B", maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>
                        {block.subtitle}
                      </p>
                    )}
                  </div>
                )}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: preview ? "1fr 1fr" : items.length <= 2 ? "1fr 1fr" : "repeat(2, 1fr)",
                  gap: px(16, 8),
                }}>
                  {items.map((item, j) => (
                    <div key={j} style={{
                      background: "#FFFFFF", border: "1px solid #E2E8F0",
                      borderRadius: px(20, 10), padding: px("28px 24px", "14px 12px"),
                      position: "relative",
                    }}>
                      {item.badge && (
                        <span style={{
                          position: "absolute", top: px(14, 8), right: px(14, 8),
                          background: `${accent}14`, color: accent,
                          fontSize: px(10, 7), fontWeight: 700, padding: px("3px 9px", "2px 6px"),
                          borderRadius: 20, letterSpacing: "0.02em",
                        }}>
                          {item.badge}
                        </span>
                      )}
                      {item.icon && (
                        <div style={{
                          width: px(44, 26), height: px(44, 26), borderRadius: px(12, 7),
                          background: `${accent}12`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: px(20, 12), marginBottom: px(16, 8),
                        }}>
                          {item.icon}
                        </div>
                      )}
                      <h3 style={{ fontSize: px(16, 10), fontWeight: 600, color: "#0F172A", marginBottom: px(6, 3) }}>
                        {item.title}
                      </h3>
                      {item.desc && (
                        <p style={{ fontSize: px(13, 9), color: "#64748B", lineHeight: 1.65 }}>{item.desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        // ── Price ─────────────────────────────────────────────────────────────
        if (block.type === "price") {
          const features = block.features ?? [];
          return (
            <section key={i} style={{ background: "#FFFFFF", padding: px("80px 40px", "36px 18px") }}>
              <div style={{ maxWidth: px(500, 300), margin: "0 auto" }}>
                <div style={{
                  background: "#FFFFFF", border: "1px solid #E2E8F0",
                  borderRadius: px(24, 14), padding: px("40px 36px", "20px 16px"),
                  boxShadow: "0 4px 28px rgba(0,0,0,0.07)",
                  textAlign: "center", position: "relative",
                }}>
                  {block.badge && (
                    <div style={{
                      position: "absolute", top: px(-14, -8), left: "50%", transform: "translateX(-50%)",
                      background: accent, color: "#fff",
                      fontSize: px(12, 8), fontWeight: 700, padding: px("5px 16px", "3px 10px"),
                      borderRadius: 20, whiteSpace: "nowrap",
                    }}>
                      {block.badge}
                    </div>
                  )}
                  {block.emoji && <div style={{ fontSize: px(48, 28), marginBottom: px(14, 8) }}>{block.emoji}</div>}
                  {block.title && (
                    <p style={{ fontSize: px(13, 9), fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: px(16, 8) }}>
                      {block.title}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: px(10, 6), marginBottom: px(8, 5) }}>
                    {block.oldPrice && (
                      <span style={{ fontSize: px(20, 13), color: "#CBD5E1", textDecoration: "line-through" }}>
                        {block.oldPrice}
                      </span>
                    )}
                    <span style={{ fontSize: px(48, 28), fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em" }}>
                      {block.newPrice}
                    </span>
                  </div>
                  {features.length > 0 && (
                    <ul style={{ listStyle: "none", margin: px("20px 0 28px", "10px 0 14px"), textAlign: "left", padding: 0 }}>
                      {features.map((f, j) => (
                        <li key={j} style={{ display: "flex", alignItems: "center", gap: px(8, 5), fontSize: px(14, 9), color: "#475569", padding: px("7px 0", "4px 0"), borderBottom: "1px solid #F1F5F9" }}>
                          <svg width={px(14, 9)} height={px(14, 9)} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="#DCFCE7"/><path d="M5 8l2.5 2.5L11 5.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {block.cta && (
                    <a href="#form" style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: accent, color: "#fff",
                      height: px(52, 38), borderRadius: px(14, 9),
                      fontWeight: 600, fontSize: px(15, 11), textDecoration: "none",
                      boxShadow: `0 4px 16px ${accent}38`,
                    }}>
                      {block.cta}
                    </a>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // ── Form ──────────────────────────────────────────────────────────────
        if (block.type === "form") {
          return (
            <section id="form" key={i} style={{ background: "#F8FAFC", padding: px("80px 40px", "36px 18px") }}>
              <div style={{ maxWidth: px(480, 300), margin: "0 auto" }}>
                <div style={{
                  background: "#FFFFFF", border: "1px solid #E2E8F0",
                  borderRadius: px(24, 14), padding: px("40px 36px", "20px 16px"),
                  boxShadow: "0 4px 28px rgba(0,0,0,0.07)",
                }}>
                  {block.title && (
                    <h2 style={{ fontSize: px(24, 15), fontWeight: 700, color: "#0F172A", textAlign: "center", marginBottom: px(6, 4) }}>
                      {block.title}
                    </h2>
                  )}
                  {block.subtitle && (
                    <p style={{ fontSize: px(15, 11), color: "#64748B", textAlign: "center", marginBottom: px(28, 16), lineHeight: 1.6 }}>
                      {block.subtitle}
                    </p>
                  )}
                  {submitted ? (
                    <div style={{ textAlign: "center", padding: px("20px 0", "12px 0"), color: "#10B981", fontWeight: 600, fontSize: px(15, 12) }}>
                      ✓ Заявка принята! Свяжемся с вами скоро.
                    </div>
                  ) : (
                    <form onSubmit={preview ? (e) => e.preventDefault() : handleSubmit}>
                      {(["Ваше имя", "Номер телефона"] as const).map((ph, fi) => (
                        <input
                          key={fi}
                          type={fi === 1 ? "tel" : "text"}
                          placeholder={ph}
                          value={preview ? "" : fi === 0 ? lead.name : lead.phone}
                          onChange={(e) => !preview && setLead(p => fi === 0 ? { ...p, name: e.target.value } : { ...p, phone: e.target.value })}
                          readOnly={preview}
                          required={!preview}
                          style={{
                            display: "block", width: "100%", boxSizing: "border-box",
                            height: px(52, 36), padding: px("0 16px", "0 11px"),
                            border: "1.5px solid #E2E8F0", borderRadius: px(12, 7),
                            fontSize: px(15, 11), marginBottom: px(10, 6),
                            outline: "none", fontFamily: "inherit",
                            background: "#FAFAFA", color: "#0F172A",
                          }}
                        />
                      ))}
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          display: "block", width: "100%",
                          height: px(52, 40), border: "none",
                          borderRadius: px(12, 8),
                          background: accent, color: "#fff",
                          fontSize: px(15, 12), fontWeight: 600,
                          cursor: submitting ? "not-allowed" : "pointer",
                          opacity: submitting ? 0.7 : 1,
                          fontFamily: "inherit", letterSpacing: "-0.01em",
                          boxShadow: `0 4px 16px ${accent}38`,
                          marginTop: px(4, 2),
                        }}
                      >
                        {submitting ? "Отправка..." : (block.button || "Отправить заявку")}
                      </button>
                    </form>
                  )}
                  {block.note && (
                    <p style={{ fontSize: px(12, 9), color: "#94A3B8", textAlign: "center", marginTop: px(14, 8) }}>
                      {block.note}
                    </p>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // ── FAQ ───────────────────────────────────────────────────────────────
        if (block.type === "faq") {
          return (
            <section key={i} style={{ background: "#FFFFFF", padding: px("96px 40px", "40px 18px") }}>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                {block.title && (
                  <h2 style={{ fontSize: px(40, 20), fontWeight: 700, color: "#0F172A", textAlign: "center", letterSpacing: "-0.025em", marginBottom: px(48, 22) }}>
                    {block.title}
                  </h2>
                )}
                {(block.items ?? []).map((item, j) => (
                  <FaqItem key={j} q={item.q} a={item.a} accent={accent} preview={preview} />
                ))}
              </div>
            </section>
          );
        }

        // ── CTA ───────────────────────────────────────────────────────────────
        if (block.type === "cta") {
          return (
            <section key={i} style={{ background: "#F8FAFC", padding: px("80px 40px", "40px 18px") }}>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div style={{
                  background: "#0F172A", borderRadius: px(24, 14),
                  padding: px("56px 40px", "28px 20px"), textAlign: "center",
                }}>
                  {block.title && (
                    <h2 style={{ fontSize: px(36, 18), fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.025em", marginBottom: px(10, 6) }}>
                      {block.title}
                    </h2>
                  )}
                  {block.subtitle && (
                    <p style={{ fontSize: px(17, 11), color: "rgba(255,255,255,0.6)", lineHeight: 1.65, marginBottom: px(32, 18) }}>
                      {block.subtitle}
                    </p>
                  )}
                  {block.cta && (
                    <a href="#form" style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      background: "#FFFFFF", color: "#0F172A",
                      padding: px("0 28px", "0 16px"), height: px(52, 36),
                      borderRadius: px(14, 9), fontWeight: 600, fontSize: px(15, 11),
                      textDecoration: "none",
                    }}>
                      {block.cta}
                      <svg width={px(14, 10)} height={px(14, 10)} viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </a>
                  )}
                  {block.note && (
                    <p style={{ fontSize: px(12, 9), color: "rgba(255,255,255,0.35)", marginTop: px(16, 8) }}>{block.note}</p>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // ── Text ──────────────────────────────────────────────────────────────
        if (block.type === "text") {
          return (
            <section key={i} style={{ background: "#FFFFFF", padding: px("56px 40px", "28px 18px") }}>
              <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
                {block.title && <h2 style={{ fontSize: px(32, 18), fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em", marginBottom: px(14, 8) }}>{block.title}</h2>}
                {block.body && <p style={{ fontSize: px(17, 12), color: "#64748B", lineHeight: 1.7 }}>{block.body}</p>}
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* Footer spacer */}
      <div style={{ height: preview ? 20 : 60, background: "#FFFFFF" }} />
    </div>
  );
}
