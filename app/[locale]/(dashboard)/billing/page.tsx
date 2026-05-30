"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    currency: "UZS",
    period: "навсегда",
    color: "border-gray-200",
    badge: null,
    features: [
      "20 генераций в час",
      "1 проект",
      "Telegram автопостинг",
      "История 100 постов",
      "Базовая аналитика",
    ],
    limits: { generations: 20, projects: 1 },
  },
  {
    key: "pro",
    name: "Pro",
    price: 149000,
    currency: "UZS",
    period: "месяц",
    color: "border-[#1D9E75]",
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
    limits: { generations: -1, projects: 10 },
  },
  {
    key: "business",
    name: "Business",
    price: 399000,
    currency: "UZS",
    period: "месяц",
    color: "border-purple-300",
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
    limits: { generations: -1, projects: -1 },
  },
];

const formatPrice = (price: number) =>
  price === 0 ? "Бесплатно" : `${price.toLocaleString("ru-RU")} сум`;

export default function BillingPage() {
  const supabase = createClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"payme" | "click">(
    "payme",
  );
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-plan"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("plan, plan_expires_at")
        .eq("id", user.id)
        .single();
      return data;
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
    <div className="p-6 max-w-5xl w-full">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Тарифы</h1>
        <p className="text-sm text-gray-500 mt-0.5">Выберите подходящий план</p>
      </div>

      {/* Current plan */}
      {currentPlan !== "free" && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1D9E75]">
              Текущий план: {PLANS.find((p) => p.key === currentPlan)?.name}
            </p>
            {(profile as any)?.plan_expires_at && (
              <p className="text-xs text-[#1D9E75]/70 mt-0.5">
                Действует до{" "}
                {new Date((profile as any).plan_expires_at).toLocaleDateString(
                  "ru-RU",
                )}
              </p>
            )}
          </div>
          <span className="text-xs bg-[#1D9E75] text-white px-2.5 py-1 rounded-full font-medium">
            Активен
          </span>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`relative bg-white rounded-2xl border-2 p-5 transition-all ${plan.color} ${isCurrent ? "shadow-md" : ""}`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.key === "pro" ? "bg-[#1D9E75] text-white" : "bg-purple-500 text-white"}`}
                >
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPrice(plan.price)}
                  {plan.price > 0 && (
                    <span className="text-sm font-normal text-gray-400">
                      /{plan.period}
                    </span>
                  )}
                </p>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1D9E75"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 flex-shrink-0"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePayment(plan.key)}
                disabled={isCurrent || plan.key === "free" || loading}
                className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                  isCurrent
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : plan.key === "free"
                      ? "bg-gray-100 text-gray-500"
                      : plan.key === "pro"
                        ? "bg-[#1D9E75] hover:bg-[#0F6E56] text-white"
                        : "bg-purple-500 hover:bg-purple-600 text-white"
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

      {/* Payment method */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3">
          Способ оплаты
        </p>
        <div className="flex gap-3">
          {[
            {
              key: "payme" as const,
              name: "Payme",
              logo: "💳",
              desc: "Uzcard, Humo, Visa",
            },
            {
              key: "click" as const,
              name: "Click",
              logo: "📱",
              desc: "Click App, карты",
            },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setPaymentMethod(m.key)}
              className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${paymentMethod === m.key ? "border-[#1D9E75] bg-[#E1F5EE]" : "border-gray-200 hover:border-gray-300"}`}
            >
              <span className="text-2xl">{m.logo}</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 grid grid-cols-2 gap-4">
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
          <div
            key={item.q}
            className="bg-white border border-gray-100 rounded-xl p-4"
          >
            <p className="text-xs font-semibold text-gray-900 mb-1">{item.q}</p>
            <p className="text-xs text-gray-500">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
