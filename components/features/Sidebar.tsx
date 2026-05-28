"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import LangSwitcher from "@/components/features/LangSwitcher";

const PROJECT_COLORS = [
  "#1D9E75",
  "#F59E0B",
  "#8B5CF6",
  "#3B82F6",
  "#EC4899",
  "#EF4444",
];

function SvgIcon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const NAV_GROUPS = [
  {
    label: "Business",
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
      },
      { key: "create", href: "/create", icon: "M12 5v14M5 12h14" },
      {
        key: "history",
        href: "/history",
        icon: "M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-4.5M3 3v5h5",
      },
      {
        key: "calendar",
        href: "/calendar",
        icon: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        key: "analytics",
        href: "/analytics",
        icon: "M3 3v18h18M7 16l4-4 4 4 4-4",
      },
      {
        key: "integrations",
        href: "/integrations",
        icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
      },
      {
        key: "settings",
        href: "/settings",
        icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
      },
    ],
  },
] as const;

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const t = useTranslations("nav");
  const locale = useLocale();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) setIsAdmin(true);
    });
    supabase
      .from("projects")
      .select("id, name")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setProjects(data || []));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
    router.refresh();
  };

  const go = (href: string) => {
    setActiveHref(href);
    startTransition(() => router.push(`/${locale}${href}`));
    onClose?.();
  };

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return (
      activeHref === href ||
      (!activeHref &&
        (pathname === full ||
          (href !== "/dashboard" && pathname.startsWith(full))))
    );
  };

  const LABELS: Record<string, string> = {
    dashboard: t("dashboard"),
    create: t("create"),
    history: t("history") || "История",
    calendar: t("calendar"),
    analytics: t("analytics") || "Аналитика",
    integrations: t("integrations") || "Интеграции",
    settings: "Настройки",
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="px-4 pt-4 pb-3 flex items-center justify-between"
        role="banner"
      >
        <button
          onClick={() => go("/dashboard")}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 bg-[#1D9E75] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-none">
              MVI Content
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">v1.0</div>
          </div>
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all text-left cursor-pointer mb-0.5 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 ${
                    active
                      ? "bg-white text-gray-900 font-medium shadow-sm border border-gray-200 rounded-lg"
                      : "text-gray-500 hover:text-gray-900 hover:bg-white/60 rounded-lg"
                  }`}
                >
                  <span className={active ? "text-gray-700" : "text-gray-400"}>
                    <SvgIcon d={item.icon} />
                  </span>
                  <span className="flex-1">{LABELS[item.key]}</span>
                  {isPending && active && (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Projects */}
        <div className="mb-4">
          <button
            onClick={() => go("/projects")}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-white/60 rounded-lg transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <span className="flex-1">Проекты</span>
          </button>
        </div>
      </nav>

      {/* Bottom — user */}
      <div className="px-3 py-3">
        <LangSwitcher />
        {isAdmin && (
          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-500 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer mb-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Admin
          </button>
        )}
        <div className="flex items-center gap-2.5 px-2 py-2 hover:bg-gray-100 transition-colors rounded-lg">
          <button
            onClick={() => go("/profile")}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
            aria-label="Личный кабинет"
          >
            <div className="w-7 h-7 bg-[#1D9E75] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-gray-900 truncate">
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "Пользователь"}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {user?.email || ""}
              </div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-300 hover:text-red-400 transition-colors p-1 cursor-pointer flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
            title="Выйти"
            aria-label="Выйти из аккаунта"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-600 cursor-pointer"
        >
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
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1D9E75] flex items-center justify-center">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
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
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-[#F4F6F8] flex flex-col h-full shadow-xl">
            <NavContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop */}
      <aside className="hidden md:flex flex-shrink-0 flex-col h-screen bg-[#F4F6F8] w-52">
        <NavContent />
      </aside>
    </>
  );
}
