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

const BUSINESS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { key: "create", href: "/create", Icon: SquarePen },
  { key: "content", href: "/history", Icon: Columns3 },
  { key: "campaigns", href: "/campaigns", Icon: Megaphone },
  { key: "calendar", href: "/calendar", Icon: Calendar },
  { key: "analytics", href: "/analytics", Icon: LineChart },
  { key: "summary", href: "/summary", Icon: Gauge },
];

const TOOLS: NavItem[] = [
  { key: "aiWorkers", href: "/ai-workers", Icon: Bot },
  { key: "tasks", href: "/tasks", Icon: ListChecks },
  { key: "abTests", href: "/ab-tests", Icon: FlaskConical },
  { key: "projects", href: "/projects", Icon: FolderOpen },
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
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "6px 10px",
          borderRadius: "7px",
          fontSize: "12px",
          textAlign: "left",
          cursor: "pointer",
          marginBottom: "1px",
          border: "none",
          outline: "none",
          transition: "background 0.12s, color 0.12s",
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
        <span style={{ flex: 1 }}>{t(item.key)}</span>
        {isPending && active && (
          <span
            style={{
              width: 10,
              height: 10,
              border: "1px solid var(--sb-tx-3)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
              display: "inline-block",
            }}
          />
        )}
      </button>
    );
  };

  const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        fontSize: "9.5px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--sb-tx-3)",
        fontWeight: 600,
        padding: "10px 10px 3px",
      }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Лого */}
      <div
        style={{
          padding: "14px 12px 10px",
          borderBottom: "0.5px solid var(--sb-border)",
        }}
      >
        <button
          onClick={() => go("/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            cursor: "pointer",
            background: "none",
            border: "none",
            outline: "none",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: "var(--accent)",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Zap size={13} color="var(--on-accent)" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--sb-tx-1)",
                lineHeight: 1,
              }}
            >
              MVI Content
            </div>
            <div
              style={{ fontSize: "9px", color: "var(--sb-tx-3)", marginTop: 2 }}
            >
              v1.0
            </div>
          </div>
        </button>
      </div>

      {/* Воркспейс */}
      <div style={{ padding: "8px 8px 4px" }}>
        <WorkspaceSwitcher />
      </div>

      {/* Навигация */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 6px 8px" }}>
        <div style={{ marginBottom: 12 }}>
          <GroupLabel>{t("groupBusiness")}</GroupLabel>
          {BUSINESS.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <GroupLabel>{t("groupTools")}</GroupLabel>
          {TOOLS.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setAgencyOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 10px 3px",
              cursor: "pointer",
              background: "none",
              border: "none",
              outline: "none",
            }}
          >
            <span
              style={{
                fontSize: "9.5px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--sb-tx-3)",
                fontWeight: 600,
              }}
            >
              {t("groupAgency")}
            </span>
            <ChevronDown
              size={12}
              strokeWidth={1.8}
              color="var(--sb-tx-3)"
              style={{
                transform: agencyOpen ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 0.15s",
              }}
            />
          </button>
          {agencyOpen &&
            AGENCY.map((item) => <NavButton key={item.href} item={item} />)}
        </div>
        <div>
          <GroupLabel>{t("groupAccount")}</GroupLabel>
          {ACCOUNT.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Футер */}
      <div
        style={{
          padding: "8px 8px",
          borderTop: "0.5px solid var(--sb-border)",
        }}
      >
        {isAdmin && (
          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              fontSize: "12px",
              color: "var(--c-3)",
              background: "none",
              border: "none",
              borderRadius: "7px",
              cursor: "pointer",
              marginBottom: 6,
            }}
          >
            <Settings size={14} strokeWidth={1.6} />
            Admin
          </button>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <LangSwitcher />
          <ThemeToggle />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: "8px",
          }}
        >
          <button
            onClick={() => go("/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 0,
              cursor: "pointer",
              background: "none",
              border: "none",
              outline: "none",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                background: "var(--accent)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--on-accent)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--sb-tx-1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "Пользователь"}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--sb-tx-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.email || ""}
              </div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            title="Выйти"
            style={{
              color: "var(--sb-tx-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 5,
              flexShrink: 0,
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
      {/* Мобильная шапка */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-line flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--sb-bg)" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            color: "var(--sb-tx-2)",
            background: "none",
            border: "none",
            cursor: "pointer",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: "var(--accent)",
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={11} color="var(--on-accent)" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--sb-tx-1)",
            }}
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

      {/* Десктоп */}
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
