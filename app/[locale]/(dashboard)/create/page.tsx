"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { WizardView } from "@/components/ads/WizardView";
import { useLocale } from "next-intl";

type ContentTab = { id: string; title: string; projectId?: string };

const TABS_KEY = "content_tabs_v1";
const ACTIVE_KEY = "content_active_v1";

function loadTabs(): ContentTab[] {
  try {
    const d = localStorage.getItem(TABS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return [{ id: "1", title: "Новый контент" }];
}
function saveTabs(tabs: ContentTab[]) {
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

// Project selector - same as campaigns
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
    queryKey: ["projects_selector_create"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id,name,niche,description,logo_url")
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
              Для контента нужен проект — бренд-данные подтянутся автоматически
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
              Загрузка...
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
              gridTemplateColumns: "repeat(2,1fr)",
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
                  padding: 16,
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

function BrowserTabs({
  tabs,
  activeId,
  onSelect,
  onAdd,
  onClose,
}: {
  tabs: ContentTab[];
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
            {tabs.length > 1 && (
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
            )}
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
      >
        +
      </button>
    </div>
  );
}

function CreatePageInner() {
  const pendingTabId = { current: null as string | null };
  const [tabs, setTabs] = useState<ContentTab[]>(() =>
    typeof window !== "undefined"
      ? loadTabs()
      : [{ id: "1", title: "Новый контент" }],
  );
  const [activeId, setActiveId] = useState(() =>
    typeof window !== "undefined" ? loadActiveId() : "1",
  );
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  useEffect(() => {
    saveTabs(tabs);
  }, [tabs]);
  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  const addTab = () => {
    const id = String(Date.now());
    // Clear any old draft for this tab id to start fresh
    try {
      localStorage.removeItem(`wizard_draft_v5_content_${id}`);
    } catch {}
    setTabs((prev) => [...prev, { id, title: "Новый контент" }]);
    setActiveId(id);
    saveActiveId(id);
    pendingTabId.current = id;
    setShowProjectSelector(true);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return [{ id: "1", title: "Новый контент" }];
      if (activeId === id) setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const handleProjectSelected = (pid: string, pname: string) => {
    const tabId = pendingTabId.current;
    if (tabId)
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, projectId: pid } : t)),
      );
    pendingTabId.current = null;
    setShowProjectSelector(false);
  };

  const updateTitle = (id: string, title: string) =>
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: title || "Новый контент" } : t,
      ),
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
          Маркетинг /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>
            Создать контент
          </span>
        </p>
        <button
          onClick={addTab}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Новый
        </button>
      </div>

      <BrowserTabs
        tabs={tabs}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          saveActiveId(id);
          const t = tabs.find((t) => t.id === id);
          if (!t?.projectId) {
            pendingTabId.current = id;
            setShowProjectSelector(true);
          }
        }}
        onAdd={addTab}
        onClose={closeTab}
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{ display: tab.id === activeId ? "block" : "none" }}
          >
            <WizardView
              key={tab.id}
              tabId={`content_${tab.id}`}
              projectId={tab.projectId}
              onClose={() => closeTab(tab.id)}
              onNameChange={(n: string) => updateTitle(tab.id, n)}
            />
          </div>
        ))}
      </div>

      {showProjectSelector && (
        <ProjectSelector
          onSelect={handleProjectSelected}
          onClose={() => {
            setShowProjectSelector(false);
            pendingTabId.current = null;
          }}
        />
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  );
}
