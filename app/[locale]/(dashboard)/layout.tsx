"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/features/Sidebar";
import { TopNavbar } from "@/components/features/TopNavbar";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const SIDEBAR_KEY = "sidebar_collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar — 0px on mobile (fixed mobile header escapes overflow), collapses on desktop */}
      <div
        style={{
          width: isMobile ? 0 : collapsed ? 0 : 220,
          overflow: "hidden",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0,
        }}
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <main className="flex-1 overflow-hidden flex flex-col gap-2 md:pt-2 md:pr-2 md:pb-2 md:pl-2 min-w-0">
        {/* Top navbar + toggle — desktop only */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggle}
            className="flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
            style={{
              width: 36,
              height: 44,
              borderRadius: 12,
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              color: "var(--tx-3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--tx-1)";
              (e.currentTarget as HTMLElement).style.background = "var(--hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--tx-3)";
              (e.currentTarget as HTMLElement).style.background = "var(--panel)";
            }}
            title={collapsed ? "Открыть меню" : "Скрыть меню"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.6} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.6} />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <TopNavbar />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 bg-panel md:border md:border-line md:rounded-2xl overflow-y-auto pt-14 md:pt-0 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
