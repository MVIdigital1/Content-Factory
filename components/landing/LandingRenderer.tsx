"use client";
import { useState } from "react";

export type HeroBlock = {
  type: "hero";
  badge?: string;
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  cta?: string;
  emoji?: string;
  centered?: boolean;
};

export type PriceBlock = {
  type: "price";
  oldPrice?: string;
  newPrice: string;
  emoji?: string;
  cta?: string;
};

export type FormBlock = {
  type: "form";
  title?: string;
  subtitle?: string;
  button?: string;
  dark?: boolean;
  note?: string;
};

export type FeaturesBlock = {
  type: "features";
  title?: string;
  items?: { icon?: string; title: string; desc?: string }[];
};

export type TextBlock = {
  type: "text";
  title?: string;
  body?: string;
};

export type Block = HeroBlock | PriceBlock | FormBlock | FeaturesBlock | TextBlock;

type Props = {
  blocks: Block[];
  bgImage?: string;
  brandColor?: string;
  selectedIndex?: number | null;
  onSelectBlock?: (index: number) => void;
  onLeadSubmit?: (data: { name: string; phone: string }) => Promise<void>;
  preview?: boolean;
};

export default function LandingRenderer({
  blocks,
  bgImage,
  brandColor = "#6366f1",
  selectedIndex = null,
  onSelectBlock,
  onLeadSubmit,
  preview = false,
}: Props) {
  const [lead, setLead] = useState({ name: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const accent = brandColor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLeadSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onLeadSubmit(lead);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const wrapBlock = (index: number, content: React.ReactNode) => {
    const isSelected = selectedIndex === index;
    const clickable = !!onSelectBlock;
    return (
      <div
        key={index}
        onClick={() => onSelectBlock?.(index)}
        style={{
          position: "relative",
          outline: isSelected ? `2px solid ${accent}` : clickable ? "2px solid transparent" : "none",
          outlineOffset: -2,
          cursor: clickable ? "pointer" : "default",
          transition: "outline 0.15s",
        }}
        onMouseEnter={(e) => {
          if (clickable && !isSelected)
            (e.currentTarget as HTMLElement).style.outline = `2px dashed ${accent}80`;
        }}
        onMouseLeave={(e) => {
          if (!isSelected)
            (e.currentTarget as HTMLElement).style.outline = clickable ? "2px solid transparent" : "none";
        }}
      >
        {isSelected && (
          <div style={{ position: "absolute", top: 4, left: 4, background: accent, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, zIndex: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {blocks[index].type}
          </div>
        )}
        {content}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: bgImage ? `url(${bgImage}) center/cover no-repeat` : "#fff", fontFamily: "'Inter', -apple-system, sans-serif", color: "#1a1a1a" }}>
      {blocks.map((block, i) => {

        // ── Hero ──────────────────────────────────────────────────────────────
        if (block.type === "hero") {
          const centered = block.centered ?? false;
          return wrapBlock(i,
            <section style={{
              background: `linear-gradient(135deg, ${accent}12, ${accent}06)`,
              padding: preview ? "28px 20px" : "64px 24px",
              textAlign: centered ? "center" : "left",
            }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                {block.badge && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1A1A18", color: "#fff", fontSize: preview ? 9 : 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: preview ? 10 : 14 }}>
                    🔥 {block.badge}
                  </div>
                )}
                {!block.badge && block.eyebrow && (
                  <p style={{ fontSize: preview ? 10 : 13, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    {block.eyebrow}
                  </p>
                )}
                {block.emoji && (
                  <div style={{ fontSize: preview ? 36 : 64, marginBottom: preview ? 10 : 16, lineHeight: 1 }}>
                    {block.emoji}
                  </div>
                )}
                <h1 style={{ fontSize: preview ? 20 : 40, fontWeight: 800, lineHeight: 1.15, marginBottom: preview ? 8 : 14, color: "#0f0f0f" }}>
                  {block.headline}
                </h1>
                {block.subheadline && (
                  <p style={{ fontSize: preview ? 11 : 17, color: "#555", lineHeight: 1.6, marginBottom: preview ? 14 : 24 }}>
                    {block.subheadline}
                  </p>
                )}
                {block.cta && (
                  <a href="#form" style={{ display: "inline-block", background: accent, color: "#fff", padding: preview ? "8px 18px" : "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: preview ? 12 : 16, textDecoration: "none", boxShadow: `0 4px 16px ${accent}40` }}>
                    {block.cta}
                  </a>
                )}
              </div>
            </section>
          );
        }

        // ── Price ─────────────────────────────────────────────────────────────
        if (block.type === "price") {
          return wrapBlock(i,
            <section style={{ padding: preview ? "16px 20px" : "40px 24px", textAlign: "center", background: `linear-gradient(135deg, ${accent}10, ${accent}04)` }}>
              <div style={{ maxWidth: 480, margin: "0 auto" }}>
                {block.emoji && (
                  <div style={{ width: preview ? 80 : 140, height: preview ? 80 : 140, borderRadius: preview ? 12 : 20, background: `linear-gradient(135deg, #1A1A18, #3A3A38)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: preview ? 32 : 64, margin: "0 auto", marginBottom: preview ? 12 : 20 }}>
                    {block.emoji}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: preview ? 8 : 12, marginBottom: preview ? 12 : 20 }}>
                  {block.oldPrice && (
                    <span style={{ fontSize: preview ? 13 : 22, color: "#999", textDecoration: "line-through" }}>
                      {block.oldPrice}
                    </span>
                  )}
                  <span style={{ fontSize: preview ? 22 : 40, fontWeight: 800, color: "#0A6E3A" }}>
                    {block.newPrice}
                  </span>
                </div>
                {block.cta && (
                  <a href="#form" style={{ display: "inline-block", background: "#0A6E3A", color: "#fff", padding: preview ? "9px 20px" : "14px 36px", borderRadius: 10, fontWeight: 700, fontSize: preview ? 12 : 16, textDecoration: "none", width: preview ? "100%" : "auto", boxSizing: "border-box" }}>
                    🛒 {block.cta}
                  </a>
                )}
              </div>
            </section>
          );
        }

        // ── Form ──────────────────────────────────────────────────────────────
        if (block.type === "form") {
          const dark = block.dark ?? false;
          return wrapBlock(i,
            <section id="form" style={{ padding: preview ? "16px" : "48px 24px", background: dark ? "#1A1A18" : "transparent" }}>
              <div style={{ maxWidth: 440, margin: "0 auto", background: dark ? "transparent" : "rgba(255,255,255,0.95)", borderRadius: 16, padding: preview ? 16 : 32, boxShadow: dark ? "none" : "0 8px 40px rgba(0,0,0,0.12)" }}>
                {block.title && (
                  <h2 style={{ fontSize: preview ? 14 : 22, fontWeight: 700, marginBottom: 6, color: dark ? "#fff" : "#0f0f0f", textAlign: "center" }}>
                    {block.title}
                  </h2>
                )}
                {block.subtitle && (
                  <p style={{ fontSize: preview ? 10 : 13, color: dark ? "rgba(255,255,255,0.6)" : "#666", marginBottom: preview ? 12 : 18, textAlign: "center" }}>
                    {block.subtitle}
                  </p>
                )}
                {submitted ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#16a34a", fontWeight: 600, fontSize: preview ? 12 : 16 }}>
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
                        onChange={(e) => !preview && setLead((p) => fi === 0 ? { ...p, name: e.target.value } : { ...p, phone: e.target.value })}
                        readOnly={preview}
                        required={!preview}
                        style={{
                          width: "100%", padding: preview ? "8px 11px" : "12px 14px",
                          border: dark ? "none" : "1px solid #e5e7eb",
                          borderRadius: 8, fontSize: preview ? 11 : 14,
                          marginBottom: preview ? 7 : 10, outline: "none", boxSizing: "border-box",
                          background: dark ? "rgba(255,255,255,0.1)" : "#fff",
                          color: dark ? "#fff" : "#1a1a1a",
                        }}
                      />
                    ))}
                    <button type="submit" disabled={submitting} style={{ width: "100%", background: dark ? "#fff" : accent, color: dark ? "#1A1A18" : "#fff", border: "none", borderRadius: 8, padding: preview ? "9px" : "13px", fontSize: preview ? 12 : 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? "Отправка..." : block.button || "Отправить заявку"}
                    </button>
                  </form>
                )}
                {block.note && (
                  <p style={{ fontSize: preview ? 9 : 11, color: dark ? "rgba(255,255,255,0.4)" : "#999", textAlign: "center", marginTop: 10 }}>
                    {block.note}
                  </p>
                )}
              </div>
            </section>
          );
        }

        // ── Features ──────────────────────────────────────────────────────────
        if (block.type === "features") {
          return wrapBlock(i,
            <section style={{ padding: preview ? "20px" : "64px 24px", maxWidth: 960, margin: "0 auto" }}>
              {block.title && (
                <h2 style={{ fontSize: preview ? 14 : 28, fontWeight: 700, textAlign: "center", marginBottom: preview ? 14 : 32, color: "#0f0f0f" }}>
                  {block.title}
                </h2>
              )}
              <div style={{ display: "grid", gridTemplateColumns: preview ? "repeat(auto-fit, minmax(100px, 1fr))" : "repeat(auto-fit, minmax(220px, 1fr))", gap: preview ? 10 : 20 }}>
                {(block.items || []).map((item, j) => (
                  <div key={j} style={{ background: "rgba(255,255,255,0.85)", borderRadius: 12, padding: preview ? "12px" : "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: preview ? 18 : 30, marginBottom: preview ? 6 : 10 }}>
                      {item.icon?.startsWith("ti-") ? "✦" : item.icon || "✦"}
                    </div>
                    <h3 style={{ fontSize: preview ? 11 : 16, fontWeight: 700, marginBottom: 4, color: "#0f0f0f" }}>{item.title}</h3>
                    {item.desc && <p style={{ fontSize: preview ? 9 : 13, color: "#666", lineHeight: 1.5 }}>{item.desc}</p>}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // ── Text ──────────────────────────────────────────────────────────────
        if (block.type === "text") {
          return wrapBlock(i,
            <section style={{ padding: preview ? "16px 20px" : "56px 24px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
              {block.title && <h2 style={{ fontSize: preview ? 13 : 26, fontWeight: 700, marginBottom: 10, color: "#0f0f0f" }}>{block.title}</h2>}
              {block.body && <p style={{ fontSize: preview ? 11 : 16, color: "#555", lineHeight: 1.7 }}>{block.body}</p>}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
