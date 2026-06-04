"use client";

const TEMPLATES = [
  {
    emoji: "🎭",
    label: "Закулисье",
    topic: "Покажу как выглядит наш рабочий процесс изнутри",
  },
  {
    emoji: "⭐",
    label: "Отзыв",
    topic: "История клиента который получил результат с нашей помощью",
  },
  {
    emoji: "🤫",
    label: "Секрет",
    topic: "Секрет который мы никогда не раскрывали публично",
  },
  {
    emoji: "📊",
    label: "Факт",
    topic: "Удивительный факт о нашей нише который мало кто знает",
  },
  {
    emoji: "❓",
    label: "Вопрос",
    topic: "Вовлекающий вопрос к аудитории о наболевшем",
  },
  {
    emoji: "🏆",
    label: "Результат",
    topic: "Наш лучший результат за последнее время с цифрами",
  },
  {
    emoji: "💡",
    label: "Совет",
    topic: "Практический лайфхак который можно применить прямо сейчас",
  },
  {
    emoji: "📖",
    label: "История",
    topic: "Личная история с уроком который изменил мой подход",
  },
  {
    emoji: "🆚",
    label: "Сравнение",
    topic: "Чем мы отличаемся от конкурентов — честно и без воды",
  },
  {
    emoji: "🎁",
    label: "Оффер",
    topic: "Специальное предложение только для подписчиков",
  },
  {
    emoji: "🔥",
    label: "Тренд",
    topic: "Главный тренд в нашей нише прямо сейчас",
  },
  {
    emoji: "🙋",
    label: "Знакомство",
    topic: "Расскажу о себе и команде то, чего вы ещё не знали",
  },
];

export default function PostTemplates({
  onSelect,
}: {
  onSelect: (topic: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">
        Шаблоны рубрик — кликни чтобы использовать:
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onSelect(t.topic)}
            className="flex items-center gap-1.5 px-2.5 py-2 border border-gray-200 rounded-lg text-left hover:border-accent hover:bg-accent-dim transition-colors cursor-pointer group"
          >
            <span className="text-sm flex-shrink-0">{t.emoji}</span>
            <span className="text-xs text-gray-600 group-hover:text-accent font-medium truncate">
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
