"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, Smartphone } from "lucide-react";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    period: "навсегда",
    border: "border-line",
    badge: null as string | null,
    features: [
      "20 генераций в час",
      "1 проект",
      "Telegram автопостинг",
      "История 100 постов",
      "Базовая аналитика",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 149000,
    period: "месяц",
    border: "border-accent",
    badge: "Популярный",
    features: [
      "Безлимит генераций",
      "10 проектов",
      "Все платформы",
      "3 варианта поста",
      "AI-оценка постов",
      "Pipeline + Задачи",
      "Хранилище 10 ГБ",
      "Приоритетная поддержка",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: 399000,
    period: "месяц",
    border: "border-c-2",
    badge: "Для агентств",
    features: [
      "Всё из Pro",
      "Безлимит проектов",
      "Команда до 10 человек",
      "AI-сотрудники",
      "White-label",
      "API доступ",
      "Хранилище 100 ГБ",
      "Личный менеджер",
    ],
  },
];

const formatPrice = (price: number) =>
  price === 0 ? "Бесплатно" : `${price.toLocaleString("ru-RU")} сум`;

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"payme" | "click">(
    "payme",
  );
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-plan"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user-plan");
      return res.ok ? res.json() : null;
    },
  });

  const currentPlan = (profile as any)?.plan || "free";

  const handlePayment = async (planKey: string) => {
    if (planKey === "free") return;
    setLoading(true);
    setSelectedPlan(planKey);
    try {
      const res = await fetch("/api/billing/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, method: paymentMethod }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl w-full">
      <div className="mb-8">
        <div className="ui-label">Подписка</div>
        <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
          Тарифы
        </h1>
        <p className="text-[13px] text-tx-2 mt-1">Выберите подходящий план</p>
      </div>

      {currentPlan !== "free" && (
        <div className="bg-accent-dim rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-accent">
              Текущий план: {PLANS.find((p) => p.key === currentPlan)?.name}
            </p>
            {(profile as any)?.plan_expires_at && (
              <p className="text-[12px] text-accent/70 mt-0.5">
                Действует до{" "}
                {new Date((profile as any).plan_expires_at).toLocaleDateString(
                  "ru-RU",
                )}
              </p>
            )}
          </div>
          <span className="text-[11px] bg-accent text-on-accent px-2.5 py-1 rounded-full font-medium">
            Активен
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`relative bg-panel rounded-2xl border-2 p-5 transition-all ${plan.border}`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.key === "pro" ? "bg-accent text-on-accent" : "bg-c-2 text-white"}`}
                >
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <p className="text-[14px] font-bold text-tx-1">{plan.name}</p>
                <p className="ui-num text-[24px] font-bold text-tx-1 mt-1">
                  {formatPrice(plan.price)}
                  {plan.price > 0 && (
                    <span className="text-[13px] font-normal text-tx-3">
                      /{plan.period}
                    </span>
                  )}
                </p>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[12px] text-tx-2"
                  >
                    <Check
                      size={13}
                      className="text-accent mt-0.5 flex-shrink-0"
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePayment(plan.key)}
                disabled={isCurrent || plan.key === "free" || loading}
                className={`w-full py-2.5 text-[13px] font-semibold rounded-xl transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-chip text-tx-3 cursor-not-allowed"
                    : plan.key === "free"
                      ? "bg-chip text-tx-2"
                      : plan.key === "pro"
                        ? "bg-accent hover:opacity-90 text-on-accent"
                        : "bg-c-2 hover:opacity-90 text-white"
                }`}
              >
                {isCurrent
                  ? "Текущий план"
                  : plan.key === "free"
                    ? "Бесплатно"
                    : loading && selectedPlan === plan.key
                      ? "Переходим..."
                      : "Выбрать"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Способ оплаты */}
      <div className="ui-surface p-4">
        <p className="text-[13px] font-semibold text-tx-1 mb-3">
          Способ оплаты
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {[
            {
              key: "payme" as const,
              name: "Payme",
              Icon: CreditCard,
              desc: "Uzcard, Humo, Visa",
            },
            {
              key: "click" as const,
              name: "Click",
              Icon: Smartphone,
              desc: "Click App, карты",
            },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setPaymentMethod(m.key)}
              className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${paymentMethod === m.key ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
            >
              <m.Icon
                size={22}
                className={
                  paymentMethod === m.key ? "text-accent" : "text-tx-2"
                }
                strokeWidth={1.6}
              />
              <div className="text-left">
                <p className="text-[13px] font-semibold text-tx-1">{m.name}</p>
                <p className="text-[12px] text-tx-3">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            q: "Можно отменить подписку?",
            a: "Да, в любой момент. Доступ сохраняется до конца оплаченного периода.",
          },
          {
            q: "Есть ли пробный период?",
            a: "Free план доступен бессрочно. Можно тестировать без ограничений по времени.",
          },
          {
            q: "Как происходит оплата?",
            a: "Через Payme или Click. Деньги списываются сразу, подписка активируется мгновенно.",
          },
          {
            q: "Нужен ли договор?",
            a: "Нет. Для физических лиц и ИП достаточно оплаты через систему.",
          },
        ].map((item) => (
          <div key={item.q} className="ui-surface p-4">
            <p className="text-[12.5px] font-semibold text-tx-1 mb-1">
              {item.q}
            </p>
            <p className="text-[12.5px] text-tx-2">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
