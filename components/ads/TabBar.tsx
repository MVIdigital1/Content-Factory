"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type TabKey = "campaigns" | "wizard" | "creatives" | "reports" | "connect";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "campaigns", label: "Кампании", icon: "≡" },
  { key: "wizard", label: "Создать", icon: "✦" },
  { key: "creatives", label: "Креативы", icon: "⬡" },
  { key: "reports", label: "Отчёты", icon: "◫" },
  { key: "connect", label: "Подключения", icon: "⊕" },
];

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) ?? "campaigns";

  const setTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "8px 14px",
        borderBottom: "0.5px solid var(--border)",
        flexShrink: 0,
        overflowX: "auto",
        background: "var(--bg-secondary)",
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              fontFamily: "inherit",
              flexShrink: 0,
              background: active ? "var(--primary)" : "transparent",
              color: active ? "var(--on-primary)" : "var(--text-secondary)",
              transition: "all 0.12s",
            }}
          >
            <span style={{ fontSize: 12 }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
