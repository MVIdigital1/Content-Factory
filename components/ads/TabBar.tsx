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
    <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-line bg-panel flex-shrink-0 overflow-x-auto">
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium rounded-t-[8px] border-b-2 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${active ? "border-accent text-accent bg-accent-dim" : "border-transparent text-tx-3 hover:text-tx-1 hover:bg-hover"}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
