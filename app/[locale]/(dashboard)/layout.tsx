"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/features/Sidebar";
import { TopNavbar } from "@/components/features/TopNavbar";
import RolePickerModal from "@/components/features/RolePickerModal";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const SIDEBAR_KEY = "sidebar_collapsed";
const ROLE_CTX_KEY = "role_context_v1";
const ROLE_CTX_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  useEffect(() => {
    // Restore sidebar state
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}

    // Check role context: show picker if not set or expired
    try {
      const raw = localStorage.getItem(ROLE_CTX_KEY);
      if (!raw) {
        setShowRolePicker(true);
        return;
      }
      const stored = JSON.parse(raw) as { savedAt: number };
      if (Date.now() - stored.savedAt >= ROLE_CTX_TTL) {
        localStorage.removeItem(ROLE_CTX_KEY);
        setShowRolePicker(true);
      }
    } catch {
      setShowRolePicker(true);
    }
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
      {/* Role picker modal — shown on first visit or after context expires */}
      {showRolePicker && (
        <RolePickerModal onSelect={() => setShowRolePicker(false)} />
      )}

      {/* Sidebar with collapse animation */}
      <div
        style={{
          width: collapsed ? 0 : 220,
          overflow: "hidden",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0,
        }}
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <main className="flex-1 overflow-hidden flex flex-col gap-2 md:pt-2 md:pr-2 md:pb-2 md:pl-2 min-w-0">
        {/* Top navbar with toggle button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle button */}
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
              (e.currentTarget as HTMLElement).style.background =
                "var(--hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--tx-3)";
              (e.currentTarget as HTMLElement).style.background =
                "var(--panel)";
            }}
            title={collapsed ? "Открыть меню" : "Скрыть меню"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.6} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.6} />
            )}
          </button>

          {/* Navbar */}
          <div className="flex-1">
            <TopNavbar />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 bg-panel border border-line rounded-2xl overflow-y-auto md:pt-0 pt-14 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
