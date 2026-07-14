"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronRight, Sparkles } from "lucide-react";

type Tip = { icon: string; text: string };

const PATH_TO_PAGE: Array<[string, string]> = [
  ["/campaigns",    "campaigns"],
  ["/projects",     "projects"],
  ["/landings",     "landings"],
  ["/content",      "content"],
  ["/analytics",    "analytics"],
  ["/integrations", "integrations"],
  ["/billing",      "billing"],
  ["/team",         "team"],
  ["/ai-agents",    "ai-agents"],
  ["/crm",          "crm"],
  ["/dashboard",    "dashboard"],
];

const PAGE_LABELS: Record<string, string> = {
  campaigns:    "Кампании",
  projects:     "Проекты",
  landings:     "Лендинги",
  content:      "Контент",
  analytics:    "Аналитика",
  integrations: "Интеграции",
  billing:      "Биллинг",
  team:         "Команда",
  "ai-agents":  "AI-агенты",
  crm:          "CRM",
  dashboard:    "Дашборд",
};

function detectPage(pathname: string): string {
  for (const [segment, key] of PATH_TO_PAGE) {
    if (pathname.includes(segment)) return key;
  }
  return "dashboard";
}

const PANEL_KEY = "ai_advisor_collapsed";

export function AiAdvisorPanel({ pathname }: { pathname: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PANEL_KEY);
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(PANEL_KEY, String(next)); } catch {}
      return next;
    });
  };

  const fetchTips = useCallback(async (page: string) => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/ai/page-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });
      const data = await r.json();
      setTips(data.tips ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const page = detectPage(pathname);
    if (page !== currentPage) {
      setCurrentPage(page);
      setTips([]);
      if (!collapsed) fetchTips(page);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collapsed && currentPage && tips.length === 0 && !loading) {
      fetchTips(currentPage);
    }
  }, [collapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageLabel = PAGE_LABELS[currentPage] ?? "Страница";

  if (collapsed) {
    return (
      <div
        style={{ width: 36, flexShrink: 0, borderLeft: "1px solid var(--line)", background: "var(--panel)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8 }}
        className="hidden md:flex"
      >
        <button
          onClick={toggleCollapsed}
          title="Открыть AI-советник"
          style={{ width: 28, height: 28, borderRadius: 8, border: "0.5px solid var(--line)", background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--accent)" }}
        >
          <Sparkles size={13} />
        </button>
        <div style={{ width: 1, flex: 1, background: "var(--line)" }} />
      </div>
    );
  }

  return (
    <div
      style={{ width: 240, flexShrink: 0, borderLeft: "1px solid var(--line)", background: "var(--panel)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      className="hidden md:flex"
    >
      {/* Header */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ color: "var(--accent)", display: "flex" }}><Sparkles size={13} /></span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-1)", flex: 1 }}>AI-советник</span>
        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 12%, var(--panel-2))", color: "var(--accent)" }}>
          {pageLabel}
        </span>
        <button
          onClick={toggleCollapsed}
          style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--tx-3)" }}
          title="Свернуть"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 4 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ borderRadius: 8, padding: "10px 12px", background: "var(--panel-2)", border: "0.5px solid var(--line)" }}>
                <div style={{ height: 8, borderRadius: 4, background: "var(--line)", marginBottom: 6, width: "60%" }} />
                <div style={{ height: 7, borderRadius: 4, background: "var(--line)", width: "90%" }} />
                <div style={{ height: 7, borderRadius: 4, background: "var(--line)", width: "75%", marginTop: 4 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 11, color: "var(--tx-3)", marginBottom: 8 }}>Не удалось загрузить советы</p>
            <button
              onClick={() => fetchTips(currentPage)}
              style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && tips.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 11, color: "var(--tx-3)" }}>✓ Советы загружены</p>
          </div>
        )}

        {!loading && tips.map((tip, i) => (
          <div key={i} style={{ borderRadius: 8, padding: "10px 12px", background: "var(--panel-2)", border: "0.5px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{tip.icon}</span>
              <p style={{ fontSize: 11, color: "var(--tx-2)", lineHeight: 1.55, margin: 0 }}>{tip.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: refresh */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
        <button
          onClick={() => fetchTips(currentPage)}
          disabled={loading}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, border: "0.5px solid var(--line)", background: "var(--panel-2)", color: "var(--tx-2)", fontSize: 11, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw size={11} style={loading ? { animation: "spin 1s linear infinite" } : undefined} />
          Обновить советы
        </button>
      </div>
    </div>
  );
}
