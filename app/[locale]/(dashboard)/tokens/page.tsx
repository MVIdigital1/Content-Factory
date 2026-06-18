"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLocale } from "next-intl";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

const ACTION_LABELS: Record<string, string> = {
  ai_chat: "AI чат",
  ai_description: "AI описание",
  creative_gen: "Генерация рекламы",
  campaign_ai: "Кампания AI",
  content_plan: "Контент-план",
  infographic_gen: "Инфографика",
};

export default function TokensPage() {
  const supabase = createClient();
  const locale = useLocale();

  // Balance with realtime
  const [balance, setBalance] = useState<any>(null);

  const fetchBalance = async () => {
    const res = await fetch("/api/tokens/balance");
    if (res.ok) setBalance(await res.json());
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel("tokens_page_rt")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_tokens",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as any;
            setBalance({
              ...row,
              tokens_remaining: Math.max(0, row.tokens_total - row.tokens_used),
            });
          }
        )
        .subscribe();
    });
    return () => { channel?.unsubscribe(); };
  }, []);

  // Transaction history
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["token_transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("token_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const pct = balance
    ? Math.min(100, Math.round((balance.tokens_used / balance.tokens_total) * 100))
    : 0;
  const low = balance && balance.tokens_remaining <= balance.tokens_total * 0.15;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-tx-1">Токены</h1>
          <p className="text-[12px] text-tx-3 mt-0.5">
            Баланс и история расходов
          </p>
        </div>
        <Link
          href={`/${locale}/billing`}
          className="px-4 py-2 rounded-[8px] text-[12px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "var(--on-accent)", textDecoration: "none" }}
        >
          ⚡ Пополнить
        </Link>
      </div>

      {/* Balance card */}
      {balance && (
        <div
          className="p-5 rounded-[14px] border border-line mb-6"
          style={{ background: "var(--panel-2)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] text-tx-3 mb-1">Текущий план</p>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-bold text-tx-1">
                  {balance.tokens_remaining.toLocaleString()}
                </span>
                <span className="text-[13px] text-tx-3">
                  / {balance.tokens_total.toLocaleString()} токенов
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full ml-1"
                  style={{ background: "var(--chip)", color: "var(--tx-2)" }}
                >
                  {PLAN_LABELS[balance.plan] ?? balance.plan}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-tx-3 mb-1">Использовано</p>
              <p className="text-[16px] font-semibold text-tx-1">
                {balance.tokens_used.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 999,
                background: low ? "var(--neg)" : "var(--accent)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: low ? "var(--neg)" : "var(--tx-3)" }}>
              {low ? "⚠ Мало токенов" : `${pct}% использовано`}
            </span>
            <span className="text-[10px] text-tx-3">
              Сброс:{" "}
              {new Date(balance.reset_at).toLocaleDateString("ru", {
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          {/* Cost reference */}
          <div className="mt-4 pt-4 border-t border-line grid grid-cols-3 gap-2">
            {[
              { label: "AI чат", cost: 5 },
              { label: "Генерация рекламы", cost: 10 },
              { label: "Кампания AI", cost: 20 },
              { label: "Контент-план", cost: 30 },
              { label: "Инфографика", cost: 50 },
              { label: "AI описание", cost: 5 },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-[7px]"
                style={{ background: "var(--panel)" }}
              >
                <span className="text-[10px] text-tx-2">{item.label}</span>
                <span className="text-[10px] font-semibold text-tx-1 ml-2">
                  −{item.cost}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h2 className="text-[13px] font-semibold text-tx-1 mb-3">
          История расходов
        </h2>
        {isLoading ? (
          <div className="text-[12px] text-tx-3 text-center py-8">Загрузка...</div>
        ) : transactions.length === 0 ? (
          <div
            className="text-center py-12 rounded-[12px] border border-dashed border-line"
          >
            <p style={{ fontSize: 26 }}>📋</p>
            <p className="text-[12px] text-tx-3 mt-2">Расходов пока нет</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3 rounded-[9px]"
                style={{ background: "var(--panel-2)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[13px] flex-shrink-0"
                    style={{ background: "var(--chip)" }}
                  >
                    {tx.action === "infographic_gen"
                      ? "🖼️"
                      : tx.action === "creative_gen"
                        ? "📢"
                        : tx.action === "campaign_ai"
                          ? "📡"
                          : tx.action === "content_plan"
                            ? "📅"
                            : "✦"}
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-tx-1">
                      {ACTION_LABELS[tx.action] ?? tx.action}
                    </p>
                    {tx.description && tx.description !== tx.action && (
                      <p className="text-[10px] text-tx-3">{tx.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-tx-3">
                    {new Date(tx.created_at).toLocaleDateString("ru", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: "var(--neg)", minWidth: 36, textAlign: "right" }}
                  >
                    {tx.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
