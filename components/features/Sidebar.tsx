"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import LangSwitcher from "@/components/features/LangSwitcher";
import WorkspaceSwitcher from "@/components/features/WorkspaceSwitcher";
import ThemeToggle from "@/components/features/ThemeToggle";
import {
  LayoutDashboard,
  SquarePen,
  Columns3,
  Megaphone,
  Calendar,
  LineChart,
  Bot,
  ListChecks,
  FlaskConical,
  FolderOpen,
  Plug,
  Contact,
  Users,
  MessagesSquare,
  Ticket,
  CreditCard,
  Gift,
  Settings,
  LogOut,
  ChevronDown,
  Gauge,
  Zap,
  type LucideIcon,
} from "lucide-react";

type NavItem = { key: string; href: string; Icon: LucideIcon };

// Основное — ежедневный маршрут контент-маркетолога (слева направо)
const BUSINESS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { key: "create", href: "/create", Icon: SquarePen },
  { key: "content", href: "/history", Icon: Columns3 }, // История + Pipeline
  { key: "campaigns", href: "/campaigns", Icon: Megaphone },
  { key: "calendar", href: "/calendar", Icon: Calendar },
  { key: "analytics", href: "/analytics", Icon: LineChart },
  { key: "summary", href: "/summary", Icon: Gauge },
];

// Инструменты — вспомогательное
const TOOLS: NavItem[] = [
  { key: "aiWorkers", href: "/ai-workers", Icon: Bot },
  { key: "tasks", href: "/tasks", Icon: ListChecks },
  { key: "abTests", href: "/ab-tests", Icon: FlaskConical },
  { key: "projects", href: "/projects", Icon: FolderOpen },
  { key: "integrations", href: "/integrations", Icon: Plug },
];

// Агентство — для команд/агентств (свёрнуто по умолчанию)
const AGENCY: NavItem[] = [
  { key: "crm", href: "/crm", Icon: Contact },
  { key: "team", href: "/team", Icon: Users },
  { key: "chat", href: "/chat", Icon: MessagesSquare },
  { key: "tickets", href: "/tickets", Icon: Ticket },
];

// Аккаунт — внизу, приглушённо
const ACCOUNT: NavItem[] = [
  { key: "billing", href: "/billing", Icon: CreditCard },
  { key: "referral", href: "/referral", Icon: Gift },
  { key: "settings", href: "/settings", Icon: Settings },
];

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [agencyOpen, setAgencyOpen] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) setIsAdmin(true);
    });
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

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const { Icon } = item;
    return (
      <button
        onClick={() => go(item.href)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] text-left cursor-pointer mb-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
          active
            ? "bg-panel text-tx-1 font-medium border border-line-strong"
            : "text-tx-2 hover:text-tx-1 hover:bg-hover border border-transparent"
        }`}
      >
        <Icon
          size={17}
          className={active ? "text-accent" : "text-tx-3"}
          strokeWidth={1.6}
        />
        <span className="flex-1">{t(item.key)}</span>
        {isPending && active && (
          <span className="w-3 h-3 border border-tx-3 border-t-transparent rounded-full animate-spin" />
        )}
      </button>
    );
  };

  const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="ui-label px-2.5 pb-2 pt-0.5">{children}</div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Логотип */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={() => go("/dashboard")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 bg-accent rounded-[9px] flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-on-accent" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <div className="text-[14px] font-semibold text-tx-1 leading-none tracking-tight">
              MVI Content
            </div>
            <div className="text-[10px] text-tx-3 mt-0.5">v1.0</div>
          </div>
        </button>
      </div>

      {/* Воркспейс */}
      <div className="px-2.5 pb-2 mb-1">
        <WorkspaceSwitcher />
      </div>

      {/* Навигация */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2">
        <div className="mb-4">
          <GroupLabel>{t("groupBusiness")}</GroupLabel>
          {BUSINESS.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>

        <div className="mb-4">
          <GroupLabel>{t("groupTools")}</GroupLabel>
          {TOOLS.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>

        {/* Агентство — сворачиваемое */}
        <div className="mb-4">
          <button
            onClick={() => setAgencyOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 pb-2 pt-0.5 cursor-pointer group"
          >
            <span className="ui-label">{t("groupAgency")}</span>
            <ChevronDown
              size={13}
              strokeWidth={1.8}
              className={`text-tx-3 transition-transform ${
                agencyOpen ? "" : "-rotate-90"
              }`}
            />
          </button>
          {agencyOpen &&
            AGENCY.map((item) => <NavButton key={item.href} item={item} />)}
        </div>

        <div className="mb-2 opacity-90">
          <GroupLabel>{t("groupAccount")}</GroupLabel>
          {ACCOUNT.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Низ — язык, тема, пользователь */}
      <div className="px-2.5 py-3 border-t border-line">
        {isAdmin && (
          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-c-3 hover:bg-hover rounded-[10px] transition-colors cursor-pointer mb-2"
          >
            <Settings size={16} strokeWidth={1.6} />
            Admin
          </button>
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <LangSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2.5 px-2 py-2 hover:bg-hover transition-colors rounded-[10px]">
          <button
            onClick={() => go("/profile")}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
            aria-label="Личный кабинет"
          >
            <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center text-on-accent text-[11px] font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12px] font-medium text-tx-1 truncate">
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "Пользователь"}
              </div>
              <div className="text-[10px] text-tx-3 truncate">
                {user?.email || ""}
              </div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="text-tx-3 hover:text-neg transition-colors p-1 cursor-pointer flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-neg"
            title="Выйти"
            aria-label="Выйти из аккаунта"
          >
            <LogOut size={14} strokeWidth={1.6} />
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
      {/* Мобильная шапка */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-panel border-b border-line flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-tx-2 cursor-pointer"
          aria-label="Меню"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <Zap size={12} className="text-on-accent" strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-semibold text-tx-1">
            MVI Content
          </span>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-sidebar flex flex-col h-full shadow-xl">
            <NavContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Десктоп */}
      <aside className="hidden md:flex flex-shrink-0 flex-col h-screen bg-sidebar border-r border-line w-[228px]">
        <NavContent />
      </aside>
    </>
  );
}
