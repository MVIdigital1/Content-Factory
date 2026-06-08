"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { useAdReports, useCreateAdReport } from "@/lib/hooks/useAdsData";
import type { AdReport } from "@/lib/supabase/types";

const STATUS_BADGE: Record<string, any> = {
  sent: "success",
  live: "info",
  scheduled: "warning",
  draft: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  sent: "Отправлен",
  live: "Live",
  scheduled: "Активна",
  draft: "Черновик",
};
const TYPE_ICON: Record<string, string> = {
  weekly: "📄",
  monthly: "📊",
  custom: "📋",
};

const REPORT_SECTIONS = [
  { label: "Расходы по платформам", on: true },
  { label: "Воронка продаж", on: true },
  { label: "Лучшие креативы", on: true },
  { label: "AI комментарий", on: true },
  { label: "Рекомендации на неделю", on: true },
  { label: "Сравнение с прошлым периодом", on: false },
];

function fmt(n: number) {
  return n > 0
    ? `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`
    : "—";
}

export function ReportsView({ projectId }: { projectId?: string }) {
  const { data: reports = [], isLoading } = useAdReports(projectId);
  const createReport = useCreateAdReport();
  const [selected, setSelected] = useState<AdReport | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [newReport, setNewReport] = useState({
    title: "",
    type: "weekly",
    period_start: "",
    period_end: "",
  });

  const fi: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    fontSize: 11,
    fontFamily: "inherit",
    border: "0.5px solid var(--border)",
    borderRadius: 7,
    background: "var(--bg)",
    color: "var(--text-primary)",
    outline: "none",
  };

  const handleCreate = async () => {
    if (!newReport.title || !newReport.period_start || !newReport.period_end)
      return;
    await createReport.mutateAsync({
      ...newReport,
      project_id: projectId,
      status: "draft",
    } as any);
    setCreateModal(false);
    setNewReport({
      title: "",
      type: "weekly",
      period_start: "",
      period_end: "",
    });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 11,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Центр отчётности</div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            White-label · авто-отправка · AI текст
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModal(true)}
        >
          + Создать отчёт
        </Button>
      </div>

      {isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: 20,
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          Загрузка...
        </div>
      )}

      {!isLoading && reports.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "28px 20px",
            color: "var(--text-secondary)",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>◫</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 5,
            }}
          >
            Нет отчётов
          </div>
          <div style={{ fontSize: 11, marginBottom: 14 }}>
            Создайте первый отчёт для клиента
          </div>
          <Button variant="primary" onClick={() => setCreateModal(true)}>
            + Создать отчёт
          </Button>
        </div>
      )}

      {reports.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid var(--border)",
            borderRadius: 9,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          {reports.map((r, i) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 13px",
                borderBottom:
                  i < reports.length - 1 ? "0.5px solid var(--border)" : "none",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {TYPE_ICON[r.type] ?? "📄"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{r.title}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {r.period_start} — {r.period_end}
                  {r.total_roas > 0 && ` · ROAS ${Math.round(r.total_roas)}%`}
                </div>
              </div>
              <Badge variant={STATUS_BADGE[r.status] ?? "muted"}>
                {STATUS_LABEL[r.status] ?? r.status}
              </Badge>
              <button
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "0.5px solid var(--border)",
                  borderRadius: 5,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  fontFamily: "inherit",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Config */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid var(--border)",
            borderRadius: 9,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 9 }}>
            Что включать
          </div>
          {REPORT_SECTIONS.map((s, i, arr) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom:
                  i < arr.length - 1 ? "0.5px solid var(--border)" : "none",
                fontSize: 11,
              }}
            >
              {s.label}
              <Toggle defaultOn={s.on} />
            </div>
          ))}
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid var(--border)",
            borderRadius: 9,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 9 }}>
            White-label
          </div>
          {[
            { label: "Логотип", value: "Загрузить", success: false },
            { label: "Отправитель", value: "" },
            { label: "Email", value: "" },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: 9 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  marginBottom: 3,
                  fontWeight: 500,
                }}
              >
                {f.label}
              </label>
              <input
                type="text"
                defaultValue={f.value}
                placeholder={f.label}
                style={{ ...fi }}
              />
            </div>
          ))}
          <p
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Клиент получает PDF без упоминания PostCentro
          </p>
        </div>
      </div>

      {/* Report detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        size="lg"
      >
        {selected && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                { l: "Расход", v: fmt(selected.total_spend) },
                { l: "Доход", v: fmt(selected.total_revenue) },
                {
                  l: "ROAS",
                  v:
                    selected.total_roas > 0
                      ? `${Math.round(selected.total_roas)}%`
                      : "—",
                },
                {
                  l: "Заявок",
                  v:
                    selected.total_leads > 0
                      ? String(selected.total_leads)
                      : "—",
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{s.v}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginTop: 3,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Период: {selected.period_start} — {selected.period_end}
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Новый отчёт"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              Название
            </label>
            <input
              value={newReport.title}
              onChange={(e) =>
                setNewReport((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Еженедельный отчёт"
              style={fi}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              Тип
            </label>
            <select
              value={newReport.type}
              onChange={(e) =>
                setNewReport((p) => ({ ...p, type: e.target.value }))
              }
              style={fi}
            >
              <option value="weekly">Еженедельный</option>
              <option value="monthly">Месячный</option>
              <option value="custom">Произвольный</option>
            </select>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}
              >
                С
              </label>
              <input
                type="date"
                value={newReport.period_start}
                onChange={(e) =>
                  setNewReport((p) => ({ ...p, period_start: e.target.value }))
                }
                style={fi}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}
              >
                По
              </label>
              <input
                type="date"
                value={newReport.period_end}
                onChange={(e) =>
                  setNewReport((p) => ({ ...p, period_end: e.target.value }))
                }
                style={fi}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setCreateModal(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              style={{ opacity: createReport.isPending ? 0.7 : 1 }}
            >
              {createReport.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
