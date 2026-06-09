"use client";
import { Suspense, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TabBar } from "@/components/ads/TabBar";
import { CampaignsView } from "@/components/ads/CampaignsView";
import { WizardView } from "@/components/ads/WizardView";
import { CreativesView } from "@/components/ads/CreativesView";
import { ReportsView } from "@/components/ads/ReportsView";
import { ConnectView } from "@/components/ads/ConnectView";
import { RightPanel } from "@/components/ads/RightPanel";

// ── Browser-style wizard tabs ──────────────────────────────────────────────
type WizardTab = { id: string; title: string };

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
      {tabs.map((tab, i) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "8px 8px 0 0",
              background: active ? "var(--bg)" : "var(--panel-2)",
              border: `0.5px solid ${active ? "var(--line)" : "transparent"}`,
              borderBottom: active ? "0.5px solid var(--bg)" : "none",
              cursor: "pointer",
              flexShrink: 0,
              marginBottom: active ? -1 : 0,
              transition: "background 0.12s",
            }}
            onClick={() => onSelect(tab.id)}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--tx-1)" : "var(--tx-3)",
                whiteSpace: "nowrap",
                maxWidth: 140,
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
                  fontSize: 12,
                  padding: "0 2px",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
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
      {/* + button to add new tab */}
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

// ── Main page inner ────────────────────────────────────────────────────────
function CampaignsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "campaigns";
  const [projectId] = useState<string | undefined>(undefined);

  // Wizard browser tabs state
  const [wizardTabs, setWizardTabs] = useState<WizardTab[]>([
    { id: "1", title: "Новая кампания" },
  ]);
  const [activeWizardId, setActiveWizardId] = useState("1");
  let nextId = wizardTabs.length + 1;

  const setTab = (t: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", t);
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const openWizard = () => setTab("wizard");

  const addWizardTab = () => {
    const id = String(Date.now());
    setWizardTabs((prev) => [...prev, { id, title: "Новая кампания" }]);
    setActiveWizardId(id);
  };

  const closeWizardTab = (id: string) => {
    setWizardTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeWizardId === id && next.length > 0)
        setActiveWizardId(next[next.length - 1].id);
      return next;
    });
  };

  const updateWizardTabTitle = (id: string, title: string) => {
    setWizardTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: title || "Новая кампания" } : t,
      ),
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Static TabBar — always visible ── */}
      <Suspense>
        <TabBar />
      </Suspense>

      {/* ── 3 action buttons on Campaigns tab ── */}
      {tab === "campaigns" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "0.5px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={openWizard}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
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
            + Создать
          </button>
          <button
            onClick={() => setTab("reports")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "var(--panel)",
              color: "var(--tx-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--panel)")
            }
          >
            ◫ Отчёты
          </button>
          <button
            onClick={() => setTab("creatives")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "var(--panel)",
              color: "var(--tx-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--panel)")
            }
          >
            ⬡ Креативы
          </button>
        </div>
      )}

      {/* ── Wizard browser-style tabs ── */}
      {tab === "wizard" && (
        <WizardTabs
          tabs={wizardTabs}
          activeId={activeWizardId}
          onSelect={setActiveWizardId}
          onAdd={addWizardTab}
          onClose={closeWizardTab}
        />
      )}

      {/* ── Main content + Right panel ── */}
      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {tab === "campaigns" && (
            <CampaignsView
              onCreateCampaign={openWizard}
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
                    onClose={() => closeWizardTab(wt.id)}
                    projectId={projectId}
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

        {/* Right: AI panel */}
        <RightPanel projectId={projectId} />
      </div>
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
