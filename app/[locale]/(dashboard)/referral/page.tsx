"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export default function ReferralPage() {
  const supabase = createClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["referral"],
    queryFn: async () => {
      const res = await fetch("/api/referral");
      return res.json();
    },
  });

  const referralUrl = data?.url || "";
  const referrals = data?.referrals || [];
  const earned = data?.earned_months || 0;

  const copy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Реферальная программа
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Приведи друга — получи месяц Pro бесплатно
        </p>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/80 mb-1">
              Твоя реферальная ссылка
            </p>
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 mb-4">
              <span className="text-xs font-mono truncate max-w-[260px]">
                {isLoading ? "Загрузка..." : referralUrl}
              </span>
              <button
                onClick={copy}
                className="flex-shrink-0 text-xs bg-white text-[#1D9E75] px-3 py-1 rounded-lg font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {copied ? "✓" : "Копировать"}
              </button>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold">{referrals.length}</p>
                <p className="text-xs text-white/70">Приглашено</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{earned}</p>
                <p className="text-xs text-white/70">Месяцев Pro</p>
              </div>
            </div>
          </div>
          <div className="text-6xl opacity-30">🎁</div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">
          Как это работает
        </p>
        <div className="space-y-3">
          {[
            { step: "1", text: "Поделись своей ссылкой с другом" },
            {
              step: "2",
              text: "Друг регистрируется и переходит на Pro или Business",
            },
            {
              step: "3",
              text: "Ты автоматически получаешь +1 месяц Pro бесплатно",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#E1F5EE] text-[#1D9E75] text-xs font-bold flex items-center justify-center flex-shrink-0">
                {item.step}
              </div>
              <p className="text-sm text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Твои рефералы
        </p>
        {referrals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">
              Ещё никто не зарегистрировался по твоей ссылке
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Поделись ссылкой в соцсетях или отправь другу
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm text-gray-900">{r.email}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${r.converted ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-gray-100 text-gray-500"}`}
                >
                  {r.converted ? "✓ Оплатил" : "Зарегистрирован"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
