"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CampaignsView } from "@/components/ads/CampaignsView";
import { WizardView } from "@/components/ads/WizardView";
import { CreativesView } from "@/components/ads/CreativesView";
import { ReportsView } from "@/components/ads/ReportsView";
import { ConnectView } from "@/components/ads/ConnectView";
import { RightPanel } from "@/components/ads/RightPanel";
import { useLocale } from "next-intl";

// ── Types ──────────────────────────────────────────────────────────────────
type TabKey = "campaigns" | "wizard" | "creatives" | "reports" | "connect";
type WizardTab = { id: string; title: string; projectId?: string };

// ── Persist wizard tabs in localStorage ───────────────────────────────────
const TABS_KEY = "wizard_tabs_v1";
const ACTIVE_KEY = "wizard_active_v1";

function loadTabs(): WizardTab[] {
  try {
    const d = localStorage.getItem(TABS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return [{ id: "1", title: "Новая кампания" }];
}
function saveTabs(tabs: WizardTab[]) {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  } catch {}
}
function loadActiveId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? "1";
  } catch {
    return "1";
  }
}
function saveActiveId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

// ── Project selector full screen ──────────────────────────────────────────
function ProjectSelector({
  onSelect,
  onClose,
}: {
  onSelect: (projectId: string, projectName: string) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const locale = useLocale();
  const router = useRouter();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects_selector"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, niche, description, logo_url, created_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const colors = [
    "#4ABA74",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#0088CC",
    "#E1306C",
  ];
  const colorFor = (id: string) => colors[id.charCodeAt(0) % colors.length];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "0.5px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}
            >
              Выберите проект
            </div>
            <div style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 3 }}>
              Для кампании нужен проект — все данные бренда подтянутся
              автоматически
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--tx-3)",
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Projects grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--tx-3)",
                fontSize: 12,
              }}
            >
              Загрузка проектов...
            </div>
          )}
          {!isLoading && projects.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--tx-1)",
                  marginBottom: 6,
                }}
              >
                Нет проектов
              </div>
              <div
                style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: 20 }}
              >
                Создайте проект чтобы начать работу с кампаниями
              </div>
              <button
                onClick={() => router.push(`/${locale}/projects`)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 9,
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                → Создать проект
              </button>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
            }}
          >
            {projects.map((p: any) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id, p.name)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "16px",
                  border: "0.5px solid var(--line)",
                  borderRadius: 12,
                  background: "var(--panel)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-dim)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "var(--panel)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    width: "100%",
                  }}
                >
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt=""
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: colorFor(p.id),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 15,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--tx-1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    {p.niche && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--tx-3)",
                          marginTop: 2,
                        }}
                      >
                        {p.niche}
                      </div>
                    )}
                  </div>
                </div>
                {p.description && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--tx-2)",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as any,
                    }}
                  >
                    {p.description}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Выбрать →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Browser-style wizard tabs ──────────────────────────────────────────────
function WizardTabs({
  tabs,
  activeId,
  onSelect,
  onAdd,
  onClose,
}: {
  tabs: WizardTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "6px 14px 0",
        borderBottom: "0.5px solid var(--line)",
        background: "var(--panel)",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px 7px",
              borderRadius: "8px 8px 0 0",
              background: active ? "var(--bg)" : "var(--panel-2)",
              border: `0.5px solid ${active ? "var(--line)" : "transparent"}`,
              borderBottom: active ? "1px solid var(--bg)" : "none",
              cursor: "pointer",
              flexShrink: 0,
              marginBottom: active ? -1 : 0,
              transition: "background 0.12s",
            }}
            onClick={() => onSelect(tab.id)}
          >
            {tab.projectId && (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--tx-1)" : "var(--tx-3)",
                whiteSpace: "nowrap",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {tab.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--tx-3)",
                fontSize: 13,
                padding: "0 2px",
                lineHeight: 1,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--tx-1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--tx-3)")
              }
            >
              ✕
            </button>
          </div>
        );
      })}
      <button
        onClick={onAdd}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: 7,
          border: "0.5px solid var(--line)",
          background: "transparent",
          cursor: "pointer",
          color: "var(--tx-3)",
          fontSize: 16,
          flexShrink: 0,
          marginLeft: 2,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--hover)";
          (e.currentTarget as HTMLElement).style.color = "var(--tx-1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--tx-3)";
        }}
        title="Новая кампания"
      >
        +
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
function CampaignsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) ?? "campaigns";
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  useEffect(() => {
  }, []);

  // Persist wizard tabs
  const [wizardTabs, setWizardTabs] = useState<WizardTab[]>(() => {
    if (typeof window !== "undefined") return loadTabs();
    return [{ id: "1", title: "Новая кампания" }];
  });
  const [activeWizardId, setActiveWizardId] = useState<string>(() => {
    if (typeof window !== "undefined") return loadActiveId();
    return "1";
  });

  // Project selector state
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  // Which tab is waiting for project selection
  const pendingTabId = useRef<string | null>(null);

  // Close confirm modal
  const [closeConfirm, setCloseConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    saveTabs(wizardTabs);
  }, [wizardTabs]);
  useEffect(() => {
    saveActiveId(activeWizardId);
  }, [activeWizardId]);

  const setTab = (t: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", t);
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // When clicking "Создать" — show project selector first
  const handleCreateClick = () => {
    // If no tabs exist (all were closed), create one first
    if (wizardTabs.length === 0 || !wizardTabs.find((t) => t.id === activeWizardId)) {
      const id = String(Date.now());
      try { localStorage.removeItem(`wizard_draft_v5_${id}`); } catch {}
      const newTab: WizardTab = { id, title: "Новая кампания" };
      setWizardTabs([newTab]);
      setActiveWizardId(id);
      saveActiveId(id);
      saveTabs([newTab]);
      pendingTabId.current = id;
      setTab("wizard");
      setShowProjectSelector(true);
      return;
    }
    setTab("wizard");
    const activeTab = wizardTabs.find((t) => t.id === activeWizardId);
    if (!activeTab?.projectId) {
      pendingTabId.current = activeWizardId;
      setShowProjectSelector(true);
    }
  };

  const addWizardTab = () => {
    const id = String(Date.now());
    // Clear any stale draft for this new tab id
    try {
      localStorage.removeItem(`wizard_draft_v5_${id}`);
    } catch {}
    const newTab: WizardTab = { id, title: "Новая кампания" };
    setWizardTabs((prev) => [...prev, newTab]);
    setActiveWizardId(id);
    saveActiveId(id);
    pendingTabId.current = id;
    setShowProjectSelector(true);
  };

  // Check if tab has any data worth saving
  const tabHasData = (id: string) => {
    try {
      const d = JSON.parse(
        localStorage.getItem(`wizard_draft_v5_${id}`) ?? "null",
      );
      return (
        d &&
        (d.name?.trim() || d.product?.trim() || (d.platforms?.length ?? 0) > 0)
      );
    } catch {
      return false;
    }
  };

  // Try to close tab — show confirm if has data
  const tryCloseWizardTab = (id: string) => {
    const tab = wizardTabs.find((t) => t.id === id);
    if (tabHasData(id)) {
      setCloseConfirm({ id, title: tab?.title ?? "Новая кампания" });
    } else {
      forceCloseWizardTab(id);
    }
  };

  // Save draft and close
  const saveDraftAndClose = (id: string) => {
    // Draft is already auto-saved to Supabase via WizardView — just close
    setCloseConfirm(null);
    forceCloseWizardTab(id);
  };

  // Delete and close (clear localStorage)
  const deleteAndClose = (id: string) => {
    try {
      localStorage.removeItem(`wizard_draft_v5_${id}`);
    } catch {}
    setCloseConfirm(null);
    forceCloseWizardTab(id);
  };

  const forceCloseWizardTab = (id: string) => {
    setWizardTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        setTab("campaigns");
        saveTabs([]);
        return [];
      }
      if (activeWizardId === id) {
        const newActive = next[next.length - 1].id;
        setActiveWizardId(newActive);
        saveActiveId(newActive);
      }
      return next;
    });
  };

  const handleProjectSelected = (pid: string, pname: string) => {
    const tabId = pendingTabId.current;
    if (tabId) {
      setWizardTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, projectId: pid } : t)),
      );
      setProjectId(pid);
    }
    pendingTabId.current = null;
    setShowProjectSelector(false);
  };

  const updateWizardTabTitle = (id: string, title: string) => {
    setWizardTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: title || "Новая кампания" } : t,
      ),
    );
  };

  // When switching wizard tabs, sync projectId
  useEffect(() => {
    const activeTab = wizardTabs.find((t) => t.id === activeWizardId);
    if (activeTab?.projectId) setProjectId(activeTab.projectId);
  }, [activeWizardId, wizardTabs]);

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Top nav ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 14px",
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch" as any,
        }}
      >
        {/* Wizard nav: Кампании › Создать */}
        {tab === "wizard" && (
          <>
            <button
              onClick={() => setTab("campaigns")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 10px",
                fontSize: 12,
                fontWeight: 400,
                border: "none",
                borderBottom: "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--tx-3)",
                whiteSpace: "nowrap",
              }}
            >
              Кампании
            </button>
            <span style={{ fontSize: 12, color: "var(--tx-3)", padding: "0 2px" }}>›</span>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                borderBottom: "2px solid var(--accent)",
                background: "transparent",
                cursor: "default",
                fontFamily: "inherit",
                color: "var(--accent)",
                whiteSpace: "nowrap",
              }}
            >
              ✦ Создать
            </button>
          </>
        )}

      </div>
      {/* ── Action buttons row (campaigns / creatives / reports tabs) ── */}
      {(tab === "campaigns" || tab === "creatives" || tab === "reports") && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderBottom: "0.5px solid var(--line)",
            flexShrink: 0,
          }}
        >
          {/* Создать + иконка черновиков */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleCreateClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                border: "none",
                borderRadius: 8,
                background: "var(--pos)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Создать
            </button>
            {wizardTabs.length > 0 && (
              <button
                onClick={handleCreateClick}
                title={`${wizardTabs.length} черновик(а) в процессе — открыть визард`}
                style={{
                  position: "relative",
                  width: 32,
                  height: 32,
                  border: "0.5px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--panel-2)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ⏳
                <span
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    padding: "0 4px",
                    background: "var(--pos)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "inherit",
                  }}
                >
                  {wizardTabs.length}
                </span>
              </button>
            )}
          </div>

          {/* Креативы */}
          <button
            onClick={() => setTab("creatives")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: tab === "creatives" ? "var(--tx-1)" : "var(--panel)",
              color: tab === "creatives" ? "var(--panel)" : "var(--tx-2)",
              fontSize: 12,
              fontWeight: tab === "creatives" ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            ⬡ Креативы
          </button>

        </div>
      )}

      {/* ── Browser-style wizard tabs row ── */}
      {tab === "wizard" && (
        <WizardTabs
          tabs={wizardTabs}
          activeId={activeWizardId}
          onSelect={(id) => {
            setActiveWizardId(id);
            saveActiveId(id);
            // If tab has no project — show selector
            const t = wizardTabs.find((t) => t.id === id);
            if (!t?.projectId) {
              pendingTabId.current = id;
              setShowProjectSelector(true);
            }
          }}
          onAdd={addWizardTab}
          onClose={tryCloseWizardTab}
        />
      )}

      {/* ── Main content + Right panel ── */}
      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", minWidth: 0 }}>
          {tab === "campaigns" && (
            <CampaignsView
              onCreateCampaign={handleCreateClick}
              projectId={projectId}
            />
          )}
          {tab === "wizard" && (
            <div>
              {wizardTabs.map((wt) => (
                <div
                  key={wt.id}
                  style={{
                    display: wt.id === activeWizardId ? "block" : "none",
                  }}
                >
                  <WizardView
                    key={wt.id}
                    tabId={wt.id}
                    onClose={() => tryCloseWizardTab(wt.id)}
                    projectId={wt.projectId}
                    onNameChange={(name: string) =>
                      updateWizardTabTitle(wt.id, name)
                    }
                  />
                </div>
              ))}
            </div>
          )}
          {tab === "creatives" && <CreativesView projectId={projectId} />}
          {tab === "reports" && <ReportsView projectId={projectId} />}
          {tab === "connect" && <ConnectView projectId={projectId} />}
        </div>
        <RightPanel projectId={projectId} />
      </div>

      {/* ── Project selector overlay ── */}
      {showProjectSelector && (
        <ProjectSelector
          onSelect={handleProjectSelected}
          onClose={() => {
            setShowProjectSelector(false);
            pendingTabId.current = null;
          }}
        />
      )}

      {/* Close confirm modal */}
      {closeConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 380,
              padding: 24,
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}
            >
              💾
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--tx-1)",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Сохранить кампанию?
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--tx-3)",
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              «{closeConfirm.title}» содержит данные. Сохранить в черновик или
              удалить?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => saveDraftAndClose(closeConfirm.id)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                💾 Сохранить в черновик
              </button>
              <button
                onClick={() => deleteAndClose(closeConfirm.id)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "0.5px solid var(--line)",
                  background: "transparent",
                  color: "var(--neg)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🗑 Удалить
              </button>
              <button
                onClick={() => setCloseConfirm(null)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: "var(--tx-3)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--tx-3)",
            fontSize: 12,
          }}
        >
          ...
        </div>
      }
    >
      <CampaignsPageInner />
    </Suspense>
  );
}
