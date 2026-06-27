"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

const NAV = [
  { href: "/ads", icon: "📡", label: "Реклама" },
  { href: "/calendar", icon: "📅", label: "Календарь" },
  { href: "/billing", icon: "💳", label: "Оплата" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/auth/login`);
  };

  const isActive = (href: string) => pathname.includes(href);

  return (
    <div
      style={{
        width: 180,
        flexShrink: 0,
        background: "var(--bg-secondary)",
        borderRight: "0.5px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "12px 10px",
      }}
    >
      <Link
        href={`/${locale}/ads`}
        style={{
          display: "block",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "-0.3px",
          color: "var(--text-primary)",
          textDecoration: "none",
          padding: "4px 8px",
          marginBottom: 14,
        }}
      >
        Post<span style={{ color: "var(--primary)" }}>Centro</span>
      </Link>

      <div style={{ flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "7px 9px",
                borderRadius: 7,
                marginBottom: 2,
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                textDecoration: "none",
                background: active ? "var(--bg-tertiary)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {active && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    flexShrink: 0,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 9 }}>
        <Link
          href={`/${locale}/settings`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 9px",
            borderRadius: 7,
            marginBottom: 4,
            fontSize: 12,
            textDecoration: "none",
            color: isActive("/settings")
              ? "var(--text-primary)"
              : "var(--text-secondary)",
            background: isActive("/settings")
              ? "var(--bg-tertiary)"
              : "transparent",
          }}
        >
          <span style={{ fontSize: 13 }}>⚙️</span> Настройки
        </Link>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: "100%",
            padding: "7px 9px",
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            background: "transparent",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ fontSize: 13 }}>→</span> Выйти
        </button>
      </div>
    </div>
  );
}
