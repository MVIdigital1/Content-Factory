"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import LangSwitcher from "@/components/features/LangSwitcher";

const Icons = {
  dashboard: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  projects: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  create: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  calendar: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  telegram: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  ),
  history: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8v4l3 3" />
      <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  analytics: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 4-4" />
    </svg>
  ),
  logout: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  menu: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
  close: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "projects", href: "/projects", icon: "projects" },
  { key: "create", href: "/create", icon: "create" },
  { key: "calendar", href: "/calendar", icon: "calendar" },
  { key: "history", href: "/history", icon: "history" },
  { key: "analytics", href: "/analytics", icon: "analytics" },
] as const;

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const t = useTranslations("nav");
  const locale = useLocale();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
    router.refresh();
  };

  const handleNav = (href: string) => {
    setActiveHref(href);
    startTransition(() => {
      router.push(`/${locale}${href}`);
    });
    onClose?.();
  };

  const NAV_LABELS: Record<string, string> = {
    dashboard: t("dashboard"),
    projects: t("projects"),
    create: t("create"),
    calendar: t("calendar"),
    history: t("history") || "История",
    analytics: t("analytics") || "Аналитика",
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1D9E75] rounded-lg flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              MVI Content
            </div>
            <div className="text-[10px] text-gray-400">Factory</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 md:hidden"
          >
            {Icons.close}
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive =
            activeHref === item.href ||
            (!activeHref &&
              (pathname === fullHref ||
                (item.href !== "/dashboard" && pathname.startsWith(fullHref))));

          const icon = Icons[item.icon as keyof typeof Icons];

          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all text-left ${
                isActive
                  ? "bg-[#E8F5EE] text-[#1D9E75] font-medium"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className={isActive ? "text-[#1D9E75]" : "text-gray-400"}>
                {icon}
              </span>
              <span className="flex-1">{NAV_LABELS[item.key]}</span>
              {isActive && !isPending && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
              )}
              {isActive && isPending && (
                <div className="w-3 h-3 border border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-100">
        <LangSwitcher />
        <div className="px-2 py-1">
          <button
            onClick={() => handleNav("/integrations")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {Icons.telegram}
            <span className="flex-1">Telegram</span>
          </button>
        </div>
        <div className="px-2 py-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            {Icons.logout}
            {t("logout")}
          </button>
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-600 cursor-pointer"
        >
          {Icons.menu}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1D9E75] rounded-md flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            MVI Content
          </span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-white flex flex-col h-full shadow-xl">
            <NavContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-shrink-0 flex-col h-screen bg-white border-r border-gray-100 transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}
      >
        {collapsed ? (
          /* Collapsed — only icons */
          <div className="flex flex-col h-full py-3">
            <div className="flex justify-center mb-4 px-2">
              <button
                onClick={() => setCollapsed(false)}
                title="Развернуть"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors cursor-pointer"
              >
                {Icons.menu}
              </button>
            </div>
            <div className="flex-1" />
          </div>
        ) : (
          /* Expanded — full sidebar */
          <div className="flex flex-col h-full relative">
            {/* Collapse toggle button */}
            <button
              onClick={() => setCollapsed(true)}
              title="Свернуть"
              className="absolute top-4 right-3 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer z-10"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <NavContent />
          </div>
        )}
      </aside>
    </>
  );
}
