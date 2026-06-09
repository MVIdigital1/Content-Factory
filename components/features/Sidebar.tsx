"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import LangSwitcher from "@/components/features/LangSwitcher";
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

const MARKETING: NavItem[] = [
  { key: "campaigns", href: "/campaigns", Icon: Megaphone },
  { key: "projects", href: "/projects", Icon: FolderOpen },
  { key: "create", href: "/create", Icon: SquarePen },
  { key: "aiWorkers", href: "/ai-workers", Icon: Bot },
];

const BUSINESS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { key: "content", href: "/history", Icon: Columns3 },
  { key: "calendar", href: "/calendar", Icon: Calendar },
  { key: "analytics", href: "/analytics", Icon: LineChart },
  { key: "summary", href: "/summary", Icon: Gauge },
];

const TOOLS: NavItem[] = [
  { key: "tasks", href: "/tasks", Icon: ListChecks },
  { key: "abTests", href: "/ab-tests", Icon: FlaskConical },
  { key: "integrations", href: "/integrations", Icon: Plug },
];

const AGENCY: NavItem[] = [
  { key: "crm", href: "/crm", Icon: Contact },
  { key: "team", href: "/team", Icon: Users },
  { key: "chat", href: "/chat", Icon: MessagesSquare },
  { key: "tickets", href: "/tickets", Icon: Ticket },
];

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
  const [marketingOpen, setMarketingOpen] = useState(true);
  const t = useTranslations("nav");
  const locale = useLocale();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      if (
        process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
        user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
      )
        setIsAdmin(true);
    });
  }, []);

  useEffect(() => {
    const mPaths = ["/campaigns", "/projects", "/create", "/ai-workers"];
    if (mPaths.some((p) => pathname.includes(p))) setMarketingOpen(true);
  }, [pathname]);

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
        className={`w-full flex items-center gap-2 px-2.5 py-[6px] rounded-[7px] text-[12px] text-left cursor-pointer mb-[1px] border border-transparent transition-all focus:outline-none ${active ? "border-transparent font-medium" : "hover:border-transparent"}`}
        style={{
          background: active ? "var(--sb-active-bg)" : "transparent",
          color: active ? "var(--sb-active-tx)" : "var(--sb-tx-2)",
        }}
        onMouseEnter={(e) => {
          if (!active)
            (e.currentTarget as HTMLElement).style.background =
              "var(--sb-hover)";
        }}
        onMouseLeave={(e) => {
          if (!active)
            (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <Icon
          size={15}
          strokeWidth={1.6}
          style={{
            color: active ? "var(--sb-active-tx)" : "var(--sb-tx-3)",
            flexShrink: 0,
          }}
        />
        <span className="flex-1">{t(item.key)}</span>
        {isPending && active && (
          <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
        )}
      </button>
    );
  };

  const GroupLabel = ({ label }: { label: string }) => (
    <div
      className="px-2.5 pb-1 pt-3"
      style={{
        fontSize: "9.5px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--sb-tx-3)",
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );

  const Collapsible = ({
    label,
    open,
    onToggle,
    children,
  }: {
    label: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2.5 pb-1 pt-3 cursor-pointer"
        style={{ background: "none", border: "none", outline: "none" }}
      >
        <span
          style={{
            fontSize: "9.5px",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "var(--sb-tx-3)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <ChevronDown
          size={11}
          strokeWidth={2}
          style={{
            color: "var(--sb-tx-3)",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s",
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? 500 : 0,
          overflow: "hidden",
          transition: "max-height 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="px-3 pt-4 pb-3"
        style={{ borderBottom: "0.5px solid var(--sb-border)" }}
      >
        <button
          onClick={() => go("/dashboard")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity w-full"
          style={{ background: "none", border: "none", outline: "none" }}
        >
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)" }}
          >
            <Zap size={14} color="var(--on-accent)" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <div
              className="text-[13px] font-semibold leading-none"
              style={{ color: "var(--sb-tx-1)" }}
            >
              MVI Content
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: "var(--sb-tx-3)" }}
            >
              v1.0
            </div>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Marketing - collapsible */}
        <Collapsible
          label="Маркетинг"
          open={marketingOpen}
          onToggle={() => setMarketingOpen((v) => !v)}
        >
          {MARKETING.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </Collapsible>

        {/* Business */}
        <div className="mb-1">
          <GroupLabel label={t("groupBusiness")} />
          {BUSINESS.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>

        {/* Tools */}
        <div className="mb-1">
          <GroupLabel label={t("groupTools")} />
          {TOOLS.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>

        {/* Agency - collapsible */}
        <Collapsible
          label={t("groupAgency")}
          open={agencyOpen}
          onToggle={() => setAgencyOpen((v) => !v)}
        >
          {AGENCY.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </Collapsible>

        {/* Account */}
        <div>
          <GroupLabel label={t("groupAccount")} />
          {ACCOUNT.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-2 py-2.5"
        style={{ borderTop: "0.5px solid var(--sb-border)" }}
      >
        {isAdmin && (
          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[12px] cursor-pointer mb-1"
            style={{ background: "none", border: "none", color: "var(--c-3)" }}
          >
            <Settings size={14} strokeWidth={1.6} /> Admin
          </button>
        )}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <LangSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-[8px]">
          <button
            onClick={() => go("/profile")}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            style={{ background: "none", border: "none", outline: "none" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div
                className="text-[12px] font-medium truncate"
                style={{ color: "var(--sb-tx-1)" }}
              >
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "Пользователь"}
              </div>
              <div
                className="text-[10px] truncate"
                style={{ color: "var(--sb-tx-3)" }}
              >
                {user?.email || ""}
              </div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            title="Выйти"
            className="p-1 rounded-md cursor-pointer flex-shrink-0"
            style={{
              background: "none",
              border: "none",
              color: "var(--sb-tx-3)",
            }}
          >
            <LogOut size={13} strokeWidth={1.6} />
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
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 border-b flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--sb-bg)", borderColor: "var(--sb-border)" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--sb-tx-2)",
          }}
        >
          <svg
            width="18"
            height="18"
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
          <div
            className="w-6 h-6 rounded-[6px] flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <Zap size={12} color="var(--on-accent)" strokeWidth={2.5} />
          </div>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--sb-tx-1)" }}
          >
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
          <div
            className="relative w-60 flex flex-col h-full shadow-xl"
            style={{ background: "var(--sb-bg)" }}
          >
            <NavContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <aside
        className="hidden md:flex flex-shrink-0 flex-col h-screen w-[220px]"
        style={{
          background: "var(--sb-bg)",
          borderRight: "0.5px solid var(--sb-border)",
        }}
      >
        <NavContent />
      </aside>
    </>
  );
}
