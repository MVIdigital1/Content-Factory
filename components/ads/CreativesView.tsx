"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAdCreatives, useCreateAdCreative } from "@/lib/hooks/useAdsData";
import type { AdCreative } from "@/lib/supabase/types";

const STATUS_BADGE: Record<string, any> = {
  active: "success",
  paused: "muted",
  winner: "accent",
  failed: "danger",
  draft: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Активен",
  paused: "Пауза",
  winner: "Победитель",
  failed: "Ошибка",
  draft: "Черновик",
};

const PLATFORM_COLORS: Record<string, string> = {
  telegram: "#0088CC",
  instagram: "#E1306C",
  tiktok: "#000",
  vk: "#0077FF",
  yandex: "#FFDB4D",
  google: "#34A853",
  meta: "#1877F2",
};
const PLATFORM_ABBR: Record<string, string> = {
  telegram: "TG",
  instagram: "IG",
  tiktok: "TT",
  vk: "VK",
  yandex: "Я",
  google: "G",
  meta: "M",
};

export function CreativesView({ projectId }: { projectId?: string }) {
  const { data: creatives = [], isLoading } = useAdCreatives(projectId);
  const createCreative = useCreateAdCreative();
  const [selected, setSelected] = useState<AdCreative | null>(null);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Креативы проекта</div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {creatives.length} креативов
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <Button variant="ghost" size="sm">
            ↑ Загрузить
          </Button>
          <Button variant="primary" size="sm">
            ✦ AI сгенерировать
          </Button>
        </div>
      </div>

      {isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          Загрузка...
        </div>
      )}

      {!isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
          }}
        >
          {creatives.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                background: "var(--bg-card)",
                border: "0.5px solid var(--border)",
                borderRadius: 9,
                padding: 10,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.title ?? ""}
                  style={{
                    width: "100%",
                    height: 90,
                    objectFit: "cover",
                    borderRadius: 7,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <div
                  style={{
                    height: 90,
                    borderRadius: 7,
                    background: `linear-gradient(135deg, ${PLATFORM_COLORS[c.platform] ?? "#333"}, #111)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    marginBottom: 8,
                  }}
                >
                  {PLATFORM_ABBR[c.platform] ?? "?"}
                </div>
              )}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  marginBottom: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.title ?? "Без названия"}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.platform} · {c.format}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Badge variant={STATUS_BADGE[c.status] ?? "muted"}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </Badge>
                {c.ctr > 0 && (
                  <Badge variant="success">CTR {c.ctr.toFixed(1)}%</Badge>
                )}
                {c.is_winner && <Badge variant="accent">Победитель</Badge>}
              </div>
            </div>
          ))}

          {/* Add new */}
          <div
            style={{
              border: "2px dashed var(--border-strong)",
              borderRadius: 9,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              minHeight: 175,
            }}
            onClick={() => {}}
          >
            <span
              style={{
                fontSize: 28,
                color: "var(--text-muted)",
                marginBottom: 7,
              }}
            >
              +
            </span>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Новый креатив
            </div>
          </div>
        </div>
      )}

      {!isLoading && creatives.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 20px",
            color: "var(--text-secondary)",
            marginTop: 20,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>⬡</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            Нет креативов
          </div>
          <div style={{ fontSize: 11 }}>
            Создайте кампанию или загрузите креативы вручную
          </div>
        </div>
      )}

      {/* Creative detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Креатив"}
        size="md"
      >
        {selected && (
          <div>
            {selected.image_url && (
              <img
                src={selected.image_url}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: 200,
                  objectFit: "cover",
                  borderRadius: 9,
                  marginBottom: 14,
                }}
              />
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                { l: "Платформа", v: selected.platform },
                { l: "Формат", v: selected.format },
                {
                  l: "CTR",
                  v: selected.ctr > 0 ? `${selected.ctr.toFixed(1)}%` : "—",
                },
                {
                  l: "Показов",
                  v:
                    selected.impressions > 0
                      ? selected.impressions.toLocaleString("ru")
                      : "—",
                },
                {
                  l: "Кликов",
                  v:
                    selected.clicks > 0
                      ? selected.clicks.toLocaleString("ru")
                      : "—",
                },
                {
                  l: "Статус",
                  v: STATUS_LABEL[selected.status] ?? selected.status,
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 7,
                    padding: "9px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginBottom: 3,
                    }}
                  >
                    {s.l}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{s.v}</div>
                </div>
              ))}
            </div>
            {selected.caption && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                  }}
                >
                  Текст
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  {selected.caption}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
