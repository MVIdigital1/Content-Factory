"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Search, Bell, ChevronDown, Settings, LogOut, User } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Кампании",   href: "/campaigns" },
  { label: "Проекты",    href: "/projects" },
  { label: "Подключения", href: "/integrations" },
  { label: "AI-агенты",  href: "/ai-workers" },
];

export function TopNavbar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifications] = useState(3); // mock

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
  };

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return pathname === full || pathname.startsWith(full + "/");
  };

  return (
    <div
      className="flex items-center px-4 flex-shrink-0"
      style={{
        height: 44,
        background: "var(--panel)",
        border: "0.5px solid var(--line)",
        borderRadius: 14,
        gap: 4,
      }}
    >
      {/* Left: nav links */}
      <div className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={`/${locale}${link.href}`}
              className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors"
              style={{
                background: active ? "var(--chip)" : "transparent",
                color: active ? "var(--tx-1)" : "var(--tx-3)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Center: spacer */}
      <div className="flex-1" />

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div ref={searchRef} style={{ position: "relative" }}>
          {searchOpen ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]" style={{ background: "var(--panel-2)", border: "0.5px solid var(--line)" }}>
              <Search size={13} style={{ color: "var(--tx-3)", flexShrink: 0 }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                placeholder="Поиск..."
                style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: "var(--tx-1)", width: 160, fontFamily: "inherit" }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 12 }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] cursor-pointer transition-colors"
              style={{ background: "none", border: "none", color: "var(--tx-3)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <Search size={15} strokeWidth={1.6} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-[8px] cursor-pointer transition-colors relative"
          style={{ background: "none", border: "none", color: "var(--tx-3)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <Bell size={15} strokeWidth={1.6} />
          {notifications > 0 && (
            <div style={{
              position: "absolute", top: 4, right: 4,
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--neg)", border: "1.5px solid var(--panel)",
            }} />
          )}
        </button>

        {/* Profile */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-[8px] cursor-pointer transition-colors"
            style={{ background: profileOpen ? "var(--hover)" : "none", border: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
            onMouseLeave={(e) => { if (!profileOpen) (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              {initials}
            </div>
            <ChevronDown size={12} strokeWidth={2} style={{ color: "var(--tx-3)", transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
          </button>

          {profileOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "var(--panel)", border: "0.5px solid var(--line)",
              borderRadius: 10, padding: 6, minWidth: 200,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 100,
            }}>
              <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--line)", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)" }}>
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Пользователь"}
                </div>
                <div style={{ fontSize: 10, color: "var(--tx-3)", marginTop: 2 }}>{user?.email}</div>
              </div>
              {[
                { icon: User, label: "Профиль", href: "/profile" },
                { icon: Settings, label: "Настройки", href: "/settings" },
              ].map((item) => (
                <button key={item.href}
                  onClick={() => { router.push(`/${locale}${item.href}`); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[12px] cursor-pointer transition-colors"
                  style={{ background: "none", border: "none", color: "var(--tx-2)", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <item.icon size={14} strokeWidth={1.6} style={{ color: "var(--tx-3)" }} />
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: "0.5px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[12px] cursor-pointer transition-colors"
                  style={{ background: "none", border: "none", color: "var(--neg)", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <LogOut size={14} strokeWidth={1.6} />
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
