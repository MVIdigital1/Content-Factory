"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Plus,
  Globe,
  Edit3,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  ExternalLink,
} from "lucide-react";

type LandingPage = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function LandingsPage() {
  const qc = useQueryClient();
  const locale = useLocale();
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: landings = [], isLoading } = useQuery({
    queryKey: ["landing_pages"],
    queryFn: async () => {
      const res = await fetch("/api/landings");
      return res.ok ? (res.json() as Promise<LandingPage[]>) : [];
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const res = await fetch(`/api/landings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      if (!res.ok) throw new Error("Ошибка обновления");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landing_pages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/landings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
    },
    onSuccess: () => {
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["landing_pages"] });
    },
  });

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/${locale}/l/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>
            Лендинги
          </h1>
          <p style={{ fontSize: 14, color: "var(--tx-3)", margin: "4px 0 0" }}>
            Создавайте и публикуйте посадочные страницы для рекламы
          </p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/landings/create`)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          Создать лендинг
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                height: 200,
                background: "var(--panel)",
                borderRadius: 14,
                border: "1px solid var(--line)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : landings.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "80px 24px",
            background: "var(--panel)",
            borderRadius: 16,
            border: "1px dashed var(--line)",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "var(--chip)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Globe size={28} style={{ color: "var(--tx-3)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
              Нет лендингов
            </p>
            <p style={{ fontSize: 14, color: "var(--tx-3)", margin: "6px 0 0" }}>
              Создайте первый лендинг с помощью AI
            </p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/landings/create`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent)",
              color: "var(--on-accent)",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Создать лендинг
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {landings.map((landing) => (
            <div
              key={landing.id}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Preview area */}
              <div
                style={{
                  height: 140,
                  background: "var(--panel-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <FileText size={32} style={{ color: "var(--tx-3)" }} />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: landing.published ? "#dcfce7" : "var(--chip)",
                    color: landing.published ? "#16a34a" : "var(--tx-3)",
                  }}
                >
                  {landing.published ? "Опубликован" : "Черновик"}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: "14px 16px 12px", flex: 1 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--tx-1)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {landing.title}
                </p>
                <p style={{ fontSize: 12, color: "var(--tx-3)", margin: "4px 0 0" }}>
                  /{landing.slug} · {formatDate(landing.updated_at)}
                </p>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  padding: "0 12px 12px",
                  borderTop: "1px solid var(--line)",
                  paddingTop: 10,
                }}
              >
                <button
                  onClick={() => router.push(`/${locale}/landings/${landing.id}/edit`)}
                  title="Редактировать"
                  style={iconBtnStyle}
                >
                  <Edit3 size={14} />
                </button>

                <button
                  onClick={() =>
                    togglePublishMutation.mutate({
                      id: landing.id,
                      published: !landing.published,
                    })
                  }
                  title={landing.published ? "Снять с публикации" : "Опубликовать"}
                  style={iconBtnStyle}
                >
                  {landing.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>

                <button
                  onClick={() => copyLink(landing.slug, landing.id)}
                  title="Скопировать ссылку"
                  style={{
                    ...iconBtnStyle,
                    color: copiedId === landing.id ? "#16a34a" : undefined,
                  }}
                >
                  <Copy size={14} />
                </button>

                {landing.published && (
                  <a
                    href={`/${locale}/l/${landing.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Открыть"
                    style={{ ...iconBtnStyle, textDecoration: "none" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}

                <div style={{ flex: 1 }} />

                {deletingId === landing.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => deleteMutation.mutate(landing.id)}
                      style={{
                        ...iconBtnStyle,
                        color: "var(--neg)",
                        fontSize: 11,
                        padding: "4px 10px",
                        width: "auto",
                      }}
                    >
                      Удалить
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      style={{ ...iconBtnStyle, fontSize: 11, padding: "4px 10px", width: "auto" }}
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(landing.id)}
                    title="Удалить"
                    style={{ ...iconBtnStyle, color: "var(--neg)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--chip)",
  border: "none",
  borderRadius: 7,
  cursor: "pointer",
  color: "var(--tx-2)",
};
