"use client";
import { useState } from "react";
import { useAdReports, useCreateAdReport } from "@/lib/hooks/useAdsData";
import type { AdReport } from "@/lib/supabase/types";

const STATUS_LABEL: Record<string, string> = {
  sent: "Отправлен",
  live: "Live",
  scheduled: "Активна",
  draft: "Черновик",
};
const STATUS_COLOR: Record<string, string> = {
  sent: "var(--pos)",
  live: "#3B82F6",
  scheduled: "#F59E0B",
  draft: "var(--tx-3)",
};
const TYPE_ICON: Record<string, string> = {
  weekly: "📄",
  monthly: "📊",
  custom: "📋",
};
const TYPE_LABEL: Record<string, string> = {
  weekly: "Еженедельные",
  monthly: "Месячные",
  custom: "Произвольные",
};

function fmt(n: number) {
  return n > 0 ? `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}` : "—";
}

const fi: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 11,
  fontFamily: "inherit",
  border: "0.5px solid var(--line)",
  borderRadius: 7,
  background: "var(--bg)",
  color: "var(--tx-1)",
  outline: "none",
};

export function ReportsView({ projectId }: { projectId?: string }) {
  const { data: reports = [], isLoading } = useAdReports(projectId);
  const createReport = useCreateAdReport();
  const [selected, setSelected] = useState<AdReport | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "weekly" | "monthly" | "custom">("all");
  const [aiSummary, setAiSummary] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [newReport, setNewReport] = useState({
    title: "",
    type: "weekly",
    period_start: "",
    period_end: "",
  });

  const filtered = typeFilter === "all" ? reports : reports.filter((r) => r.type === typeFilter);

  const handleCreate = async () => {
    if (!newReport.title || !newReport.period_start || !newReport.period_end) return;
    await createReport.mutateAsync({
      ...newReport,
      project_id: projectId,
      status: "draft",
    } as any);
    setCreateModal(false);
    setNewReport({ title: "", type: "weekly", period_start: "", period_end: "" });
  };

  const handleGenerateAi = async (report: AdReport) => {
    setGeneratingAi(true);
    setAiSummary("");
    try {
      const prompt = `Создай краткий AI-комментарий для рекламного отчёта.

Отчёт: ${report.title}
Период: ${report.period_start} — ${report.period_end}
Расход: ${fmt(report.total_spend ?? 0)}
Доход: ${fmt(report.total_revenue ?? 0)}
ROAS: ${report.total_roas > 0 ? Math.round(report.total_roas) + "%" : "—"}
Заявок: ${report.total_leads ?? 0}

Напиши 3-4 предложения: что хорошо, что улучшить, главный вывод. Без заголовков, только текст.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setAiSummary(data.content?.[0]?.text ?? "");
    } catch {
      setAiSummary("Ошибка генерации. Попробуйте ещё раз.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-tx-1">Отчёты</p>
          <p className="text-[11px] text-tx-3 mt-0.5">
            White-label · авто-отправка · AI текст · PDF
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 border border-line rounded-[7px] px-3 py-1.5 text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
          >
            ⬇ PDF
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer"
          >
            + Создать отчёт
          </button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 mb-4">
        {(["all", "weekly", "monthly", "custom"] as const).map((t) => {
          const count = t === "all" ? reports.length : reports.filter((r) => r.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-[8px] text-[11px] border cursor-pointer transition-colors ${typeFilter === t ? "bg-tx-1 text-panel border-tx-1 font-medium" : "border-line text-tx-3 hover:bg-hover"}`}
            >
              {t === "all" ? `Все · ${count}` : `${TYPE_ICON[t]} ${TYPE_LABEL[t]}${count > 0 ? ` · ${count}` : ""}`}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="text-center py-10 text-tx-3 text-[12px]">Загрузка...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-14">
          <div className="text-[32px] mb-3">◫</div>
          <p className="text-[13px] font-medium text-tx-1 mb-1">
            {typeFilter === "all" ? "Нет отчётов" : `Нет ${TYPE_LABEL[typeFilter].toLowerCase()}`}
          </p>
          <p className="text-[11px] text-tx-3 mb-4">Создайте первый отчёт для клиента</p>
          <button
            onClick={() => setCreateModal(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
          >
            + Создать отчёт
          </button>
        </div>
      )}

      {/* Reports list */}
      {filtered.length > 0 && (
        <div className="space-y-2 mb-5">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelected(r); setAiSummary(""); }}
              className="flex items-center gap-3 px-4 py-3 bg-panel border border-line rounded-[9px] cursor-pointer hover:border-line-strong transition-colors"
            >
              <span className="text-[16px] flex-shrink-0">{TYPE_ICON[r.type] ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-tx-1 truncate">{r.title}</p>
                <p className="text-[10px] text-tx-3 mt-0.5">
                  {r.period_start} — {r.period_end}
                  {(r.total_roas ?? 0) > 0 && ` · ROAS ${Math.round(r.total_roas)}%`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: STATUS_COLOR[r.status] ?? "var(--tx-3)",
                    padding: "2px 8px",
                    borderRadius: 20,
                    border: `0.5px solid ${STATUS_COLOR[r.status] ?? "var(--line)"}`,
                  }}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrintPdf(); }}
                  className="w-6 h-6 flex items-center justify-center border border-line rounded-[5px] text-[10px] text-tx-2 hover:bg-hover cursor-pointer"
                  title="Скачать PDF"
                >
                  ⬇
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-[560px] bg-panel border border-line rounded-[14px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-panel z-10">
              <div>
                <p className="text-[14px] font-semibold text-tx-1">{selected.title}</p>
                <p className="text-[10px] text-tx-3 mt-0.5">
                  {TYPE_ICON[selected.type]} {TYPE_LABEL[selected.type]} · {selected.period_start} — {selected.period_end}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  ⬇ PDF
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3 text-[14px]"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Расход", v: fmt(selected.total_spend ?? 0) },
                  { l: "Доход", v: fmt(selected.total_revenue ?? 0) },
                  { l: "ROAS", v: (selected.total_roas ?? 0) > 0 ? `${Math.round(selected.total_roas)}%` : "—" },
                  { l: "Заявок", v: (selected.total_leads ?? 0) > 0 ? String(selected.total_leads) : "—" },
                ].map((s) => (
                  <div key={s.l} className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5">
                    <p className="text-[10px] text-tx-3 mb-1">{s.l}</p>
                    <p className="text-[18px] font-semibold text-tx-1">{s.v}</p>
                  </div>
                ))}
              </div>

              {/* AI summary */}
              <div className="border border-line rounded-[9px] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-panel-2 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]">✦</span>
                    <span className="text-[11px] font-medium text-tx-1">AI комментарий</span>
                  </div>
                  <button
                    onClick={() => handleGenerateAi(selected)}
                    disabled={generatingAi}
                    className="text-[11px] text-accent cursor-pointer hover:opacity-80 disabled:opacity-50"
                  >
                    {generatingAi ? "⟳ Генерирую..." : aiSummary ? "↻ Перегенерировать" : "✦ Сгенерировать"}
                  </button>
                </div>
                <div className="px-4 py-3">
                  {aiSummary ? (
                    <p className="text-[11px] text-tx-2 leading-relaxed">{aiSummary}</p>
                  ) : (
                    <p className="text-[11px] text-tx-3 text-center py-2">
                      Нажмите «✦ Сгенерировать» чтобы AI написал вывод по отчёту
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={() => setCreateModal(false)} />
          <div className="relative w-full max-w-[400px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">Новый отчёт</h2>
              <button
                onClick={() => setCreateModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3 text-[14px]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-tx-2 mb-1.5">Название</label>
                <input value={newReport.title} onChange={(e) => setNewReport((p) => ({ ...p, title: e.target.value }))} placeholder="Еженедельный отчёт" style={fi} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-2 mb-1.5">Тип</label>
                <div className="flex gap-2">
                  {(["weekly", "monthly", "custom"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewReport((p) => ({ ...p, type: t }))}
                      className={`flex-1 py-1.5 text-[11px] rounded-[7px] border cursor-pointer transition-colors ${newReport.type === t ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
                    >
                      {TYPE_ICON[t]} {t === "weekly" ? "Неделя" : t === "monthly" ? "Месяц" : "Период"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-tx-2 mb-1.5">С</label>
                  <input type="date" value={newReport.period_start} onChange={(e) => setNewReport((p) => ({ ...p, period_start: e.target.value }))} style={fi} />
                </div>
                <div>
                  <label className="block text-[11px] text-tx-2 mb-1.5">По</label>
                  <input type="date" value={newReport.period_end} onChange={(e) => setNewReport((p) => ({ ...p, period_end: e.target.value }))} style={fi} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCreateModal(false)}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newReport.title || !newReport.period_start || !newReport.period_end || createReport.isPending}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {createReport.isPending ? "Создание..." : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
