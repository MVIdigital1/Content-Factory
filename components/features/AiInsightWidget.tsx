"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLocale } from "next-intl";

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
  const locale = useLocale();

  useEffect(() => {
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
        setInsight(
          FALLBACK_INSIGHTS[new Date().getDay() % FALLBACK_INSIGHTS.length],
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-accent rounded-2xl p-4 text-on-accent">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-on-accent" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-accent/70 mb-1">
            AI-совет на сегодня
          </p>
          {loading ? (
            <div className="h-4 bg-white/20 rounded animate-pulse w-3/4" />
          ) : (
            <p className="text-[14px] font-medium leading-snug">{insight}</p>
          )}
        </div>
        {!loading && (
          <Link
            href={`/${locale}/create`}
            className="flex-shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap"
          >
            Создать →
          </Link>
        )}
      </div>
    </div>
  );
}
