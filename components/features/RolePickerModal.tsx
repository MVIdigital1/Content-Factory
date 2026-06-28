"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Users, Clock } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type RoleContext = {
  workspaceId: string;
  workspaceName: string;
  role: string;
  roleLabel: string;
  roleColor: string;
  roleIcon: string;
  projectCount: number;
};

type StoredContext = {
  context: RoleContext;
  savedAt: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = "role_context_v1";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SYSTEM_ROLE_META: Record<string, { label: string; color: string; icon: string }> = {
  owner:        { label: "Владелец",       color: "#FF5A36", icon: "👑" },
  admin:        { label: "Администратор",  color: "#B5740F", icon: "🛡️" },
  manager:      { label: "Менеджер",       color: "#1B5FA8", icon: "💼" },
  content_maker:{ label: "Контент-мейкер", color: "#0E6E56", icon: "✍️" },
  analyst:      { label: "Аналитик",       color: "#5A4FBE", icon: "📊" },
  client:       { label: "Клиент",         color: "#6E6557", icon: "👤" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useRoleContext
// ─────────────────────────────────────────────────────────────────────────────

export function useRoleContext(): { role: string | null; workspaceId: string | null; clearContext: () => void } {
  const [ctx, setCtx] = useState<RoleContext | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredContext;
      if (Date.now() - stored.savedAt < TTL_MS) {
        setCtx(stored.context);
      } else {
        localStorage.removeItem(LS_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const clearContext = useCallback(() => {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setCtx(null);
  }, []);

  return {
    role: ctx?.role || null,
    workspaceId: ctx?.workspaceId || null,
    clearContext,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  onSelect: (context: RoleContext) => void;
};

export default function RolePickerModal({ onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["role-picker-contexts"],
    queryFn: async (): Promise<{ contexts: RoleContext[]; isOwner: boolean }> => {
      const res = await fetch("/api/team/role-contexts");
      if (!res.ok) return { contexts: [], isOwner: false };
      return res.json();
    },
  });

  useEffect(() => {
    if (!data) return;

    if (data.contexts.length === 0) {
      setShowModal(true);
      return;
    }

    if (data.contexts.length === 1) {
      // Auto-select single context
      const ctx = data.contexts[0];
      saveAndSelect(ctx);
      return;
    }

    // Multiple contexts → show picker
    setShowModal(true);
  }, [data]);

  function saveAndSelect(ctx: RoleContext) {
    try {
      const stored: StoredContext = { context: ctx, savedAt: Date.now() };
      localStorage.setItem(LS_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
    onSelect(ctx);
  }

  function handleConfirm() {
    if (!selected || !data) return;
    const ctx = data.contexts.find(c => c.workspaceId === selected);
    if (ctx) saveAndSelect(ctx);
  }

  function handleOwnerEntry() {
    if (!data) return;
    const ownerCtx = data.contexts.find(c => c.role === "owner");
    if (ownerCtx) saveAndSelect(ownerCtx);
  }

  if (!showModal) return null;

  // No contexts: waiting for access
  if (!isLoading && data && data.contexts.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
        <div className="w-full max-w-sm mx-4 rounded-2xl border border-line shadow-2xl p-8 text-center" style={{ background: "var(--panel)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,90,54,0.1)" }}>
            <Clock size={24} style={{ color: "var(--accent)" }} strokeWidth={1.6} />
          </div>
          <h2 className="text-[16px] font-semibold text-tx-1 mb-2" style={{ fontFamily: "'Unbounded', sans-serif" }}>
            Ожидание доступа
          </h2>
          <p className="text-[13px] text-tx-2 mb-2">
            Вам ещё не назначена роль ни в одном воркспейсе.
          </p>
          <p className="text-[12px] text-tx-3 mb-6">
            Обратитесь к администратору, чтобы получить приглашение.
          </p>
          <button
            onClick={() => { saveAndSelect({ workspaceId: "", workspaceName: "", role: "guest", roleLabel: "Гость", roleColor: "#888888", roleIcon: "👤", projectCount: 0 }); }}
            className="w-full py-2.5 border border-line rounded-[10px] text-[13px] text-tx-2 hover:bg-hover cursor-pointer transition-colors"
            style={{ fontFamily: "inherit" }}
          >
            Продолжить без роли
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-line shadow-2xl" style={{ background: "var(--panel)" }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-line">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,90,54,0.1)" }}>
              <Users size={16} style={{ color: "var(--accent)" }} strokeWidth={1.6} />
            </div>
            <h2 className="text-[16px] font-semibold text-tx-1" style={{ fontFamily: "'Unbounded', sans-serif" }}>
              Выберите роль для входа
            </h2>
          </div>
          <p className="text-[12px] text-tx-3 mt-1 ml-11">
            Администратор назначил вам доступ к нескольким воркспейсам
          </p>
        </div>

        {/* Context list */}
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--panel-2)" }} />
              ))}
            </div>
          ) : (data?.contexts || []).map((ctx) => {
            const isSelected = selected === ctx.workspaceId;
            return (
              <button
                key={ctx.workspaceId}
                onClick={() => setSelected(ctx.workspaceId)}
                className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all cursor-pointer"
                style={{
                  borderColor: isSelected ? ctx.roleColor : "var(--line)",
                  background: isSelected ? ctx.roleColor + "0D" : "var(--panel-2)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0"
                  style={{ background: ctx.roleColor + "1A" }}
                >
                  {ctx.roleIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-tx-1">{ctx.roleLabel}</span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: ctx.roleColor + "1A", color: ctx.roleColor }}
                    >
                      {ctx.role}
                    </span>
                  </div>
                  <p className="text-[12px] text-tx-3 truncate mt-0.5">{ctx.workspaceName}</p>
                  {ctx.projectCount > 0 && (
                    <p className="text-[11px] text-tx-3">{ctx.projectCount} проект(-ов)</p>
                  )}
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ctx.roleColor }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-2.5 bg-accent text-on-accent text-[13px] font-semibold rounded-[10px] hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
            style={{ fontFamily: "inherit" }}
          >
            Войти
          </button>
          {data?.isOwner && (
            <button
              onClick={handleOwnerEntry}
              className="w-full text-[12px] text-tx-3 hover:text-tx-2 cursor-pointer transition-colors text-center py-1"
            >
              Войти со всеми правами владельца
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
