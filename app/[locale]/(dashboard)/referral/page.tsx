"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Check } from "lucide-react";

export default function ReferralPage() {
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
    <div className="p-6 md:p-8 max-w-2xl w-full">
      <div className="mb-6">
        <div className="ui-label">Программа</div>
        <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
          Реферальная программа
        </h1>
        <p className="text-[13px] text-tx-2 mt-1">
          Приведи друга — получи месяц Pro бесплатно
        </p>
      </div>

      {/* Hero */}
      <div className="bg-accent rounded-2xl p-6 text-on-accent mb-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-on-accent/80 mb-2">
              Твоя реферальная ссылка
            </p>
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 mb-4">
              <span className="text-[12px] font-mono truncate max-w-[240px]">
                {isLoading ? "Загрузка..." : referralUrl}
              </span>
              <button
                onClick={copy}
                className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] bg-panel text-accent px-3 py-1 rounded-lg font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Готово" : "Копировать"}
              </button>
              <button
                onClick={() => {
                  // TODO: определить действие кнопки
                }}
                className="flex-shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                {/* TODO: вынести в messages/ (ru/uz/en) */}
                Поехали
              </button>
            </div>
            <div className="flex gap-5">
              <div>
                <p className="ui-num text-[24px] font-bold">
                  {referrals.length}
                </p>
                <p className="text-[11px] text-on-accent/70">Приглашено</p>
              </div>
              <div>
                <p className="ui-num text-[24px] font-bold">{earned}</p>
                <p className="text-[11px] text-on-accent/70">Месяцев Pro</p>
              </div>
            </div>
          </div>
          <Gift
            size={56}
            className="opacity-30 flex-shrink-0"
            strokeWidth={1.4}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="ui-surface p-5 mb-5">
        <p className="text-[14px] font-semibold text-tx-1 mb-4">
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
              <div className="w-7 h-7 rounded-full bg-accent-dim text-accent text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                {item.step}
              </div>
              <p className="text-[13px] text-tx-2">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      <div className="ui-surface p-5">
        <p className="text-[14px] font-semibold text-tx-1 mb-3">
          Твои рефералы
        </p>
        {referrals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[13px] text-tx-3">
              Ещё никто не зарегистрировался по твоей ссылке
            </p>
            <p className="text-[12px] text-tx-3 mt-1 opacity-70">
              Поделись ссылкой в соцсетях или отправь другу
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2.5 border-b border-line last:border-0"
              >
                <div>
                  <p className="text-[13px] text-tx-1">{r.email}</p>
                  <p className="text-[11px] text-tx-3">
                    {new Date(r.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <span
                  className={`text-[10.5px] px-2.5 py-1 rounded-full font-medium ${
                    r.converted
                      ? "bg-accent-dim text-accent"
                      : "bg-chip text-tx-2"
                  }`}
                >
                  {r.converted ? "Оплатил" : "Зарегистрирован"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
