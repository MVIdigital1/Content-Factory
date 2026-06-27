"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";
import {
  Save,
  Globe,
  EyeOff,
  ChevronLeft,
  ExternalLink,
  Smartphone,
  Monitor,
} from "lucide-react";

type LandingPage = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[];
  bg_image: string | null;
  settings: { brandColor?: string; tone?: string };
};

export default function LandingEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const locale = useLocale();
  const qc = useQueryClient();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: landing, isLoading } = useQuery({
    queryKey: ["landing", id],
    queryFn: async () => {
      const res = await fetch(`/api/landings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<LandingPage>;
    },
  });

  useEffect(() => {
    if (landing?.blocks) setBlocks(landing.blocks as Block[]);
  }, [landing]);

  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      setSaving(true);
      const update: Record<string, unknown> = { content: { blocks } };
      if (publish !== undefined) update.published = publish;
      const res = await fetch(`/api/landings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
    },
    onSuccess: () => {
      setSaving(false);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["landing", id] });
      qc.invalidateQueries({ queryKey: ["landing_pages"] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => setSaving(false),
  });

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;
  const brandColor = landing?.settings?.brandColor || "#6366f1";

  const updateBlock = (field: string, value: string) => {
    if (selectedIndex === null) return;
    setBlocks((prev) => {
      const next = [...prev];
      next[selectedIndex] = { ...next[selectedIndex], [field]: value } as Block;
      return next;
    });
  };

  const updateFeatureItem = (itemIndex: number, field: string, value: string) => {
    if (selectedIndex === null) return;
    setBlocks((prev) => {
      const next = [...prev];
      const block = { ...(next[selectedIndex] as any) };
      const items = [...(block.items || [])];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      block.items = items;
      next[selectedIndex] = block;
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--tx-3)",
        }}
      >
        Загрузка...
      </div>
    );
  }

  if (!landing) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--tx-3)",
        }}
      >
        Лендинг не найден
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 16px",
          height: 52,
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push(`/${locale}/landings`)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: "var(--tx-3)",
            fontSize: 13,
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 6,
          }}
        >
          <ChevronLeft size={15} />
          Назад
        </button>

        <div style={{ width: 1, height: 20, background: "var(--line)" }} />

        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--tx-1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {landing.title}
        </span>

        {/* Preview mode toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--chip)",
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          {(["desktop", "mobile"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPreviewMode(m)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                border: "none",
                borderRadius: 6,
                background: previewMode === m ? "var(--panel)" : "transparent",
                color: previewMode === m ? "var(--tx-1)" : "var(--tx-3)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {m === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => saveMutation.mutate(undefined)}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--chip)",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: saved ? "#16a34a" : "var(--tx-1)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Save size={14} />
            {saved ? "Сохранено" : saving ? "..." : "Сохранить"}
          </button>

          <button
            onClick={() => saveMutation.mutate(!landing.published)}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: landing.published ? "var(--chip)" : "var(--accent)",
              color: landing.published ? "var(--tx-2)" : "var(--on-accent)",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {landing.published ? (
              <>
                <EyeOff size={14} />
                Снять
              </>
            ) : (
              <>
                <Globe size={14} />
                Опубликовать
              </>
            )}
          </button>

          {landing.published && (
            <a
              href={`/${locale}/l/${landing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--chip)",
                color: "var(--tx-2)",
                border: "none",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Preview pane */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#e5e7eb",
            padding: 24,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: previewMode === "mobile" ? 375 : "100%",
              maxWidth: previewMode === "mobile" ? 375 : 960,
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              minHeight: 400,
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                height: 32,
                background: "#f1f3f4",
                borderBottom: "1px solid #ddd",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 6,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <div
                style={{
                  flex: 1,
                  background: "#fff",
                  borderRadius: 4,
                  height: 16,
                  margin: "0 12px",
                  fontSize: 9,
                  color: "#999",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                }}
              >
                {typeof window !== "undefined" ? window.location.origin : ""}/{locale}/l/{landing.slug}
              </div>
            </div>
            <LandingRenderer
              blocks={blocks}
              bgImage={landing.bg_image || undefined}
              brandColor={brandColor}
              selectedIndex={selectedIndex}
              onSelectBlock={(i) => setSelectedIndex(selectedIndex === i ? null : i)}
              preview
            />
          </div>
        </div>

        {/* Sidebar */}
        <div
          style={{
            width: 280,
            borderLeft: "1px solid var(--line)",
            background: "var(--panel)",
            overflow: "auto",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedBlock === null ? (
            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
                Блоки страницы
              </p>
              <p style={{ fontSize: 12, color: "var(--tx-3)", margin: 0 }}>
                Кликните на блок в превью чтобы редактировать
              </p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {blocks.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "var(--chip)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>
                      {b.type === "hero" ? "🏠" : b.type === "form" ? "📝" : b.type === "features" ? "✦" : "📄"}
                    </span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
                        {b.type === "hero" ? "Герой" : b.type === "form" ? "Форма" : b.type === "features" ? "Преимущества" : "Текст"}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>
                        {b.type === "hero" && (b as any).headline?.slice(0, 30)}
                        {b.type === "form" && (b as any).title?.slice(0, 30)}
                        {b.type === "features" && (b as any).title?.slice(0, 30)}
                        {b.type === "text" && (b as any).title?.slice(0, 30)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)" }}>
                  {selectedBlock.type === "hero" ? "🏠 Герой" : selectedBlock.type === "form" ? "📝 Форма" : selectedBlock.type === "features" ? "✦ Преимущества" : "📄 Текст"}
                </span>
                <button
                  onClick={() => setSelectedIndex(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--tx-3)",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: 2,
                  }}
                >
                  ×
                </button>
              </div>

              {selectedBlock.type === "hero" && (
                <>
                  <SideField label="Eyebrow">
                    <input
                      value={(selectedBlock as any).eyebrow || ""}
                      onChange={(e) => updateBlock("eyebrow", e.target.value)}
                      style={sideInputStyle}
                      placeholder="Фраза над заголовком"
                    />
                  </SideField>
                  <SideField label="Заголовок">
                    <textarea
                      value={(selectedBlock as any).headline || ""}
                      onChange={(e) => updateBlock("headline", e.target.value)}
                      rows={3}
                      style={{ ...sideInputStyle, resize: "vertical" }}
                      placeholder="Главный заголовок"
                    />
                  </SideField>
                  <SideField label="Подзаголовок">
                    <textarea
                      value={(selectedBlock as any).subheadline || ""}
                      onChange={(e) => updateBlock("subheadline", e.target.value)}
                      rows={3}
                      style={{ ...sideInputStyle, resize: "vertical" }}
                      placeholder="Описание оффера"
                    />
                  </SideField>
                  <SideField label="Кнопка CTA">
                    <input
                      value={(selectedBlock as any).cta || ""}
                      onChange={(e) => updateBlock("cta", e.target.value)}
                      style={sideInputStyle}
                      placeholder="Текст кнопки"
                    />
                  </SideField>
                </>
              )}

              {selectedBlock.type === "form" && (
                <>
                  <SideField label="Заголовок формы">
                    <input
                      value={(selectedBlock as any).title || ""}
                      onChange={(e) => updateBlock("title", e.target.value)}
                      style={sideInputStyle}
                    />
                  </SideField>
                  <SideField label="Подзаголовок">
                    <input
                      value={(selectedBlock as any).subtitle || ""}
                      onChange={(e) => updateBlock("subtitle", e.target.value)}
                      style={sideInputStyle}
                    />
                  </SideField>
                  <SideField label="Текст кнопки">
                    <input
                      value={(selectedBlock as any).button || ""}
                      onChange={(e) => updateBlock("button", e.target.value)}
                      style={sideInputStyle}
                    />
                  </SideField>
                </>
              )}

              {selectedBlock.type === "features" && (
                <>
                  <SideField label="Заголовок секции">
                    <input
                      value={(selectedBlock as any).title || ""}
                      onChange={(e) => updateBlock("title", e.target.value)}
                      style={sideInputStyle}
                    />
                  </SideField>
                  {((selectedBlock as any).items || []).map(
                    (item: { icon?: string; title: string; desc?: string }, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          padding: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", margin: 0 }}>
                          Пункт {idx + 1}
                        </p>
                        <input
                          value={item.icon || ""}
                          onChange={(e) => updateFeatureItem(idx, "icon", e.target.value)}
                          style={sideInputStyle}
                          placeholder="Иконка (эмодзи)"
                        />
                        <input
                          value={item.title}
                          onChange={(e) => updateFeatureItem(idx, "title", e.target.value)}
                          style={sideInputStyle}
                          placeholder="Заголовок"
                        />
                        <textarea
                          value={item.desc || ""}
                          onChange={(e) => updateFeatureItem(idx, "desc", e.target.value)}
                          rows={2}
                          style={{ ...sideInputStyle, resize: "vertical" }}
                          placeholder="Описание"
                        />
                      </div>
                    )
                  )}
                </>
              )}

              {selectedBlock.type === "text" && (
                <>
                  <SideField label="Заголовок">
                    <input
                      value={(selectedBlock as any).title || ""}
                      onChange={(e) => updateBlock("title", e.target.value)}
                      style={sideInputStyle}
                    />
                  </SideField>
                  <SideField label="Текст">
                    <textarea
                      value={(selectedBlock as any).body || ""}
                      onChange={(e) => updateBlock("body", e.target.value)}
                      rows={5}
                      style={{ ...sideInputStyle, resize: "vertical" }}
                    />
                  </SideField>
                </>
              )}

              <button
                onClick={() => saveMutation.mutate(undefined)}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  marginTop: 4,
                }}
              >
                <Save size={13} />
                {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const sideInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  background: "var(--panel-2)",
  border: "1px solid var(--line)",
  borderRadius: 7,
  fontSize: 13,
  color: "var(--tx-1)",
  outline: "none",
  boxSizing: "border-box",
};
