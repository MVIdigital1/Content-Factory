"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FALLBACK_INSIGHTS = [
  "Поделитесь закулисьем вашего бизнеса — это всегда вызывает интерес",
  "Расскажите историю одного довольного клиента с конкретным результатом",
  "Опубликуйте полезный лайфхак из вашей ниши — сохранения растут",
  "Задайте вопрос аудитории — вовлечённость будет максимальной",
  "Покажите процесс создания вашего продукта изнутри",
];

export default function AiInsightWidget() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем кэш
    const cached = sessionStorage.getItem("ai_insight");
    const cachedAt = sessionStorage.getItem("ai_insight_at");
    if (cached && cachedAt && Date.now() - Number(cachedAt) < 3600000) {
      setInsight(cached);
      setLoading(false);
      return;
    }

    fetch("/api/ai/insight")
      .then((r) => r.json())
      .then((data) => {
        const text =
          data.insight ||
          FALLBACK_INSIGHTS[new Date().getDay() % FALLBACK_INSIGHTS.length];
        setInsight(text);
        sessionStorage.setItem("ai_insight", text);
        sessionStorage.setItem("ai_insight_at", String(Date.now()));
      })
      .catch(() => {
        // Если API недоступен — показываем fallback
        const text =
          FALLBACK_INSIGHTS[new Date().getDay() % FALLBACK_INSIGHTS.length];
        setInsight(text);
      })
      .finally(() => setLoading(false));
  }, []);

  // Всегда показываем — даже если API не ответил
  return (
    <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] rounded-xl p-4 text-white">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 text-base">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70 mb-1">
            AI-совет на сегодня
          </p>
          {loading ? (
            <div className="h-4 bg-white/20 rounded animate-pulse w-3/4" />
          ) : (
            <p className="text-sm font-medium leading-snug">{insight}</p>
          )}
        </div>
        {!loading && (
          <Link
            href="/create"
            className="flex-shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            Создать →
          </Link>
        )}
      </div>
    </div>
  );
}
