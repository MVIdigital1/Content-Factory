"use client";
import { useState } from "react";

export type HeroBlock = {
  type: "hero";
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  cta?: string;
};

export type FormBlock = {
  type: "form";
  title?: string;
  subtitle?: string;
  button?: string;
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

export type Block = HeroBlock | FormBlock | FeaturesBlock | TextBlock;

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
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              background: accent,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              zIndex: 10,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {blocks[index].type}
          </div>
        )}
        {content}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgImage ? `url(${bgImage}) center/cover no-repeat` : "#fff",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#1a1a1a",
      }}
    >
      {blocks.map((block, i) => {
        if (block.type === "hero") {
          return wrapBlock(
            i,
            <section
              style={{
                padding: preview ? "40px 24px" : "80px 24px",
                maxWidth: 960,
                margin: "0 auto",
                display: "flex",
                gap: 48,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 320px" }}>
                {block.eyebrow && (
                  <p
                    style={{
                      fontSize: preview ? 11 : 13,
                      fontWeight: 600,
                      color: accent,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 12,
                    }}
                  >
                    {block.eyebrow}
                  </p>
                )}
                <h1
                  style={{
                    fontSize: preview ? 22 : 42,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    marginBottom: 16,
                    color: "#0f0f0f",
                  }}
                >
                  {block.headline}
                </h1>
                {block.subheadline && (
                  <p
                    style={{
                      fontSize: preview ? 12 : 18,
                      color: "#555",
                      lineHeight: 1.6,
                      marginBottom: 28,
                    }}
                  >
                    {block.subheadline}
                  </p>
                )}
                {block.cta && !preview && (
                  <a
                    href="#form"
                    style={{
                      display: "inline-block",
                      background: accent,
                      color: "#fff",
                      padding: "14px 32px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 16,
                      textDecoration: "none",
                      boxShadow: `0 4px 16px ${accent}40`,
                    }}
                  >
                    {block.cta}
                  </a>
                )}
              </div>
            </section>
          );
        }

        if (block.type === "form") {
          return wrapBlock(
            i,
            <section
              id="form"
              style={{
                padding: preview ? "20px 24px" : "60px 24px",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 16,
                  padding: preview ? 16 : 36,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
                }}
              >
                {block.title && (
                  <h2
                    style={{
                      fontSize: preview ? 14 : 24,
                      fontWeight: 700,
                      marginBottom: 8,
                      color: "#0f0f0f",
                    }}
                  >
                    {block.title}
                  </h2>
                )}
                {block.subtitle && (
                  <p
                    style={{
                      fontSize: preview ? 11 : 14,
                      color: "#666",
                      marginBottom: 20,
                    }}
                  >
                    {block.subtitle}
                  </p>
                )}
                {submitted ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 0",
                      color: "#16a34a",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Заявка принята! Свяжемся с вами скоро.
                  </div>
                ) : (
                  <form onSubmit={preview ? (e) => e.preventDefault() : handleSubmit}>
                    <input
                      type="text"
                      placeholder="Ваше имя"
                      value={preview ? "" : lead.name}
                      onChange={(e) => setLead((p) => ({ ...p, name: e.target.value }))}
                      readOnly={preview}
                      required={!preview}
                      style={{
                        width: "100%",
                        padding: preview ? "8px 12px" : "12px 16px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: preview ? 11 : 15,
                        marginBottom: 10,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="Номер телефона"
                      value={preview ? "" : lead.phone}
                      onChange={(e) => setLead((p) => ({ ...p, phone: e.target.value }))}
                      readOnly={preview}
                      required={!preview}
                      style={{
                        width: "100%",
                        padding: preview ? "8px 12px" : "12px 16px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: preview ? 11 : 15,
                        marginBottom: 16,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: "100%",
                        background: accent,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: preview ? "8px" : "14px",
                        fontSize: preview ? 12 : 16,
                        fontWeight: 700,
                        cursor: "pointer",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? "Отправка..." : block.button || "Отправить заявку"}
                    </button>
                  </form>
                )}
              </div>
            </section>
          );
        }

        if (block.type === "features") {
          return wrapBlock(
            i,
            <section
              style={{
                padding: preview ? "24px" : "72px 24px",
                maxWidth: 960,
                margin: "0 auto",
              }}
            >
              {block.title && (
                <h2
                  style={{
                    fontSize: preview ? 15 : 32,
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: preview ? 16 : 40,
                    color: "#0f0f0f",
                  }}
                >
                  {block.title}
                </h2>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: preview
                    ? "repeat(auto-fit, minmax(120px, 1fr))"
                    : "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: preview ? 12 : 24,
                }}
              >
                {(block.items || []).map((item, j) => (
                  <div
                    key={j}
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      borderRadius: 12,
                      padding: preview ? "12px" : "28px",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: preview ? 18 : 32,
                        marginBottom: preview ? 6 : 12,
                      }}
                    >
                      {item.icon?.startsWith("ti-") ? "✦" : item.icon || "✦"}
                    </div>
                    <h3
                      style={{
                        fontSize: preview ? 11 : 18,
                        fontWeight: 700,
                        marginBottom: 6,
                        color: "#0f0f0f",
                      }}
                    >
                      {item.title}
                    </h3>
                    {item.desc && (
                      <p style={{ fontSize: preview ? 10 : 14, color: "#666", lineHeight: 1.5 }}>
                        {item.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (block.type === "text") {
          return wrapBlock(
            i,
            <section
              style={{
                padding: preview ? "16px 24px" : "60px 24px",
                maxWidth: 720,
                margin: "0 auto",
                textAlign: "center",
              }}
            >
              {block.title && (
                <h2
                  style={{
                    fontSize: preview ? 14 : 28,
                    fontWeight: 700,
                    marginBottom: 12,
                    color: "#0f0f0f",
                  }}
                >
                  {block.title}
                </h2>
              )}
              {block.body && (
                <p style={{ fontSize: preview ? 11 : 16, color: "#555", lineHeight: 1.7 }}>
                  {block.body}
                </p>
              )}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
