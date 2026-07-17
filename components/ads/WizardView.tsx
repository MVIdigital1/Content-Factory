"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { PLATFORM_META } from "./data";
import {
  useCreateAdCampaign,
  useCreateAdCreative,
} from "@/lib/hooks/useAdsData";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import LandingRenderer from "@/components/landing/LandingRenderer";
import LandingDetail from "@/components/landing/LandingDetail";

const ALL_STEP_DEFS = [
  { key: "goal" as const, label: "Цель" },
  { key: "landing" as const, label: "Лендинг" },
  { key: "platforms" as const, label: "Платформы" },
  { key: "content" as const, label: "Контент" },
  { key: "launch" as const, label: "Запуск" },
];

const WIZARD_NICHE_TREE = [
  { icon: "☕", label: "Еда и напитки", subs: ["Кофейня", "Ресторан", "Доставка еды", "Кондитерская", "Бар", "Фастфуд", "Кейтеринг", "Пекарня", "Суши / Роллы", "Пиццерия", "Чайхана", "Фуд-корт"] },
  { icon: "👗", label: "Одежда и мода", subs: ["Женская одежда", "Мужская одежда", "Детская одежда", "Обувь", "Аксессуары", "Спортивная одежда", "Свадебные наряды", "Дизайнерская одежда", "Секонд-хенд", "Трикотаж"] },
  { icon: "💄", label: "Красота и уход", subs: ["Салон красоты", "Косметика", "Маникюр / Педикюр", "СПА", "Парфюм", "Уход за кожей", "Барбершоп", "Татуировки", "Бровисты / Ресницы", "Массаж"] },
  { icon: "💻", label: "IT / Технологии", subs: ["SaaS", "Мобильное приложение", "Веб-разработка", "Геймдев", "Кибербезопасность", "AI / ML", "Облачные сервисы", "Электроника", "Стартап", "IT-аутсорс"] },
  { icon: "📚", label: "Образование", subs: ["Онлайн-курсы", "Репетиторство", "Языковая школа", "Детское образование", "Бизнес-обучение", "Профессиональные курсы", "Университет / Колледж", "Автошкола"] },
  { icon: "🏋️", label: "Спорт и здоровье", subs: ["Фитнес-клуб", "Йога / Пилатес", "Единоборства", "Спортпит", "Тренажёры", "Бег / Триатлон", "Бассейн", "Танцы"] },
  { icon: "🏥", label: "Медицина", subs: ["Клиника", "Стоматология", "Ветклиника", "Аптека", "Косметология", "Психология / Психотерапия", "Офтальмология", "Лабораторная диагностика"] },
  { icon: "🏗️", label: "Строительство", subs: ["Ремонт и отделка", "Дизайн интерьера", "Стройматериалы", "Архитектура", "Инженерные системы", "Окна и двери", "Кровля", "Ландшафтный дизайн"] },
  { icon: "🏠", label: "Товары для дома", subs: ["Мебель", "Декор", "Кухонные товары", "Бытовая техника", "Текстиль", "Освещение", "Сантехника", "Садовые товары"] },
  { icon: "🚗", label: "Авто", subs: ["Автосалон", "Автосервис", "Автозапчасти", "Детейлинг", "Шиномонтаж", "Мотоциклы", "Аренда авто", "Тюнинг", "Автомойка"] },
  { icon: "🏡", label: "Недвижимость", subs: ["Жилая недвижимость", "Коммерческая недвижимость", "Аренда квартир", "Застройщик", "Риэлтор", "Загородная недвижимость", "Апартаменты", "Коворкинг"] },
  { icon: "✈️", label: "Туризм и путешествия", subs: ["Турагентство", "Отель / Хостел", "Авиабилеты", "Аренда жилья", "Экскурсии", "Визовый центр", "Круизы", "Горнолыжный курорт"] },
  { icon: "🐾", label: "Домашние животные", subs: ["Зоомагазин", "Ветклиника", "Груминг", "Дрессировка", "Зоогостиница", "Корма для животных"] },
  { icon: "💰", label: "Финансы", subs: ["Банк", "Страхование", "Инвестиции", "Микрокредиты", "Бухгалтерия", "Криптовалюта", "Лизинг", "Налоговый консалтинг"] },
  { icon: "⚖️", label: "Юридические услуги", subs: ["Адвокат", "Нотариус", "Корпоративное право", "Иммиграция", "Патенты / Авторское право"] },
  { icon: "🎉", label: "Мероприятия", subs: ["Свадебное агентство", "Event-агентство", "Аренда зала", "Ведущий / Тамада", "Флористика", "Аниматоры"] },
  { icon: "📦", label: "Логистика", subs: ["Курьерская доставка", "Транспортная компания", "Склад и хранение", "Переезды", "Грузоперевозки"] },
  { icon: "⚙️", label: "Услуги", subs: ["Маркетинг и реклама", "HR / Рекрутинг", "Клининг", "Консалтинг", "PR-агентство", "Полиграфия", "Охрана", "Ремонт техники"] },
  { icon: "🌿", label: "Экология / ЗОЖ", subs: ["Органические продукты", "Экотовары", "Вегетарианство", "ЗОЖ-продукты", "Натуральная косметика"] },
  { icon: "🎮", label: "Развлечения", subs: ["Кино / Стриминг", "Музыка", "Игры / Геймдев", "Квест-комнаты", "Боулинг", "Детский парк"] },
  { icon: "👶", label: "Детские товары", subs: ["Детская одежда", "Игрушки", "Детское питание", "Школьные принадлежности", "Детская мебель"] },
  { icon: "📸", label: "Фото / Видео", subs: ["Фотостудия", "Видеопроизводство", "Дрон-съёмка", "Графический дизайн", "Фотограф"] },
  { icon: "🌾", label: "Сельское хозяйство", subs: ["Фермерство", "Агротехника", "Семена и удобрения", "Животноводство", "Теплицы"] },
  { icon: "🎨", label: "Творчество и искусство", subs: ["Галерея", "Арт-студия", "Музыкальная школа", "Театр", "Handmade / Крафт"] },
  { icon: "📱", label: "Медиа / SMM", subs: ["Новостной портал", "Блог", "YouTube-канал", "Telegram-канал", "Подкаст", "SMM-агентство"] },
  { icon: "✦", label: "Другое", subs: [] },
];

const PLATFORM_SUBTYPES: Record<
  string,
  { value: string; label: string; emoji: string }[]
> = {
  telegram: [
    { value: "post", label: "Пост", emoji: "📝" },
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  instagram: [
    { value: "post", label: "Пост", emoji: "🖼" },
    { value: "reels", label: "Reels", emoji: "🎬" },
    { value: "stories", label: "Stories", emoji: "⭕" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  tiktok: [
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  vk: [
    { value: "post", label: "Пост", emoji: "📝" },
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  yandex: [
    { value: "search", label: "Поиск", emoji: "🔍" },
    { value: "rsya", label: "РСЯ", emoji: "📊" },
  ],
  google: [
    { value: "search", label: "Поиск", emoji: "🔍" },
    { value: "display", label: "КМС", emoji: "🖼" },
    { value: "video", label: "YouTube", emoji: "▶️" },
  ],
  meta: [
    { value: "feed", label: "Лента", emoji: "📱" },
    { value: "stories", label: "Stories", emoji: "⭕" },
    { value: "reels", label: "Reels", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  mytarget: [
    { value: "feed", label: "Лента", emoji: "📱" },
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "banner", label: "Баннер", emoji: "🖼" },
  ],
};

const PRESET_GOALS = [
  "Продажи / заявки",
  "Трафик на сайт",
  "Охват",
  "Подписчики",
  "Узнаваемость бренда",
  "Вовлечённость",
  "Установки приложения",
  "Просмотры видео",
];

const BASE_STORAGE_KEY = "wizard_draft_v5";
function loadDraft(tabId?: string) {
  try {
    return JSON.parse(
      localStorage.getItem(`${BASE_STORAGE_KEY}_${tabId ?? "0"}`) ?? "null",
    );
  } catch {
    return null;
  }
}
function saveDraft(d: any, tabId?: string) {
  try {
    localStorage.setItem(
      `${BASE_STORAGE_KEY}_${tabId ?? "0"}`,
      JSON.stringify(d),
    );
  } catch {}
}
function clearDraft(tabId?: string) {
  try {
    localStorage.removeItem(`${BASE_STORAGE_KEY}_${tabId ?? "0"}`);
  } catch {}
}

function Dropdown({
  label,
  icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line rounded-[9px] overflow-hidden">
      <button
        onClick={onToggle}
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-panel hover:bg-hover transition-colors cursor-pointer"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-[12px] font-medium text-tx-1 text-left">
          {label}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-tx-3 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-tx-3 flex-shrink-0" />
        )}
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}
      >
        <div className="border-t border-line bg-panel-2 p-3">{children}</div>
      </div>
    </div>
  );
}

async function generateCreativeContent(params: {
  platform: string;
  subtype: string;
  product: string;
  goal: string;
  audience: string;
  projectName: string;
  niche?: string;
  tone?: string;
  keywords?: string;
  budget?: string;
  variationIndex?: number;
}): Promise<Record<string, any>> {
  const res = await fetch("/api/ai/generate-creative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// ── Project images panel ──────────────────────────────────────────────────
function ProjectImagesPanel({ projectId }: { projectId?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  const { data: projectFiles = [] } = useQuery({
    queryKey: ["project-files-wizard", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res = await fetch(`/api/project-files?project_id=${projectId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data ?? []).filter(
        (f: any) =>
          f.file_type === "image" ||
          f.file_url?.match(/\.(jpg|jpeg|png|webp|gif)/i),
      );
    },
  });

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) =>
        setLocalPreviews((p) => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none bg-panel text-tx-1";

  return (
    <div>
      <label className="block ui-label mb-2">Фото продукта для AI</label>

      {!projectId ? (
        <div className="p-4 bg-panel-2 border border-line rounded-[9px] text-center">
          <p className="text-[11px] text-tx-3">
            Выберите проект чтобы увидеть картинки
          </p>
        </div>
      ) : (
        <>
          {projectFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {projectFiles.map((f: any) => (
                <div key={f.id} className="relative group">
                  <img
                    src={f.file_url}
                    alt={f.name}
                    className="w-full h-20 object-cover rounded-[7px] cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-[7px] transition-colors" />
                </div>
              ))}
            </div>
          )}

          {localPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {localPreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-20 object-cover rounded-[7px]"
                  />
                  <button
                    onClick={() =>
                      setLocalPreviews((p) => p.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-panel-2 border border-dashed border-line rounded-[8px]">
            <p className="text-[10px] text-tx-3 mb-2 text-center">
              {projectFiles.length === 0
                ? "Нет картинок в проекте — добавьте чтобы проверить как работает"
                : "Хотите добавить другую картинку?"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleLocalFile}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-2 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer transition-colors text-center"
            >
              📎 Прикрепить файл
            </button>
          </div>
        </>
      )}

      <div className="mt-3 p-3 bg-chip/40 rounded-[8px] flex items-start gap-2">
        <span className="text-[14px] flex-shrink-0">✦</span>
        <p className="text-[11px] text-tx-2 leading-relaxed">
          <strong>AI готов</strong> — сгенерирует реальный текст для каждого
          типа поста на каждой платформе
        </p>
      </div>
    </div>
  );
}

// ── Bulk schedule modal ───────────────────────────────────────────────────
export function BulkScheduleModal({
  creatives,
  onClose,
  onScheduled,
}: {
  creatives: any[];
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [mode, setMode] = useState<"2days" | "week" | "month" | "custom">(
    "week",
  );
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [scheduling, setScheduling] = useState(false);

  const getModeLabel = () =>
    ({
      "2days": "На 2 дня",
      week: "На неделю",
      month: "На месяц",
      custom: "Свой период",
    })[mode];

  const getEndDate = () => {
    const start = new Date(startDate);
    if (mode === "2days") {
      start.setDate(start.getDate() + 2);
      return start;
    }
    if (mode === "week") {
      start.setDate(start.getDate() + 7);
      return start;
    }
    if (mode === "month") {
      start.setMonth(start.getMonth() + 1);
      return start;
    }
    return new Date(endDate);
  };

  const handleBulkSchedule = async () => {
    if (creatives.length === 0) return;
    setScheduling(true);
    try {
      const start = new Date(startDate);
      const end = getEndDate();
      const totalMs = end.getTime() - start.getTime();
      const interval = totalMs / Math.max(creatives.length, 1);

      for (let i = 0; i < creatives.length; i++) {
        const c = creatives[i];
        const scheduledAt = new Date(start.getTime() + interval * i);
        if (c.id) {
          await fetch("/api/scheduled-posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content_id: c.id,
              platform: c.platform,
              scheduled_at: scheduledAt.toISOString(),
              status: "pending",
              retry_count: 0,
            }),
          });
          await fetch(`/api/ad-creatives/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" }),
          });
        }
      }
      onScheduled();
      onClose();
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[440px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-tx-1">
            Запланировать все · {creatives.length} постов
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Mode select */}
          <div>
            <label className="block ui-label mb-2">Период</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "2days", l: "📅 На 2 дня", d: "Быстрый тест" },
                  { v: "week", l: "📅 На неделю", d: "Равномерно 7 дней" },
                  { v: "month", l: "📅 На месяц", d: "Равномерно 30 дней" },
                  { v: "custom", l: "✎ Свой период", d: "Выбрать даты" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setMode(opt.v)}
                  className={`p-3 border rounded-[9px] cursor-pointer text-left transition-colors ${mode === opt.v ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                >
                  <div
                    className={`text-[11px] font-medium ${mode === opt.v ? "text-accent" : "text-tx-1"}`}
                  >
                    {opt.l}
                  </div>
                  <div className="text-[9px] text-tx-3 mt-0.5">{opt.d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="block ui-label mb-1">Начало</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inp}
            />
          </div>

          {/* Custom end date */}
          {mode === "custom" && (
            <div>
              <label className="block ui-label mb-1">Конец</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inp}
              />
            </div>
          )}

          {/* Preview */}
          <div className="p-3 bg-panel-2 border border-line rounded-[8px]">
            <p className="text-[11px] text-tx-2">
              {creatives.length} постов · {getModeLabel()} · начиная с{" "}
              {new Date(startDate).toLocaleDateString("ru", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-[10px] text-tx-3 mt-1">
              Публикации распределятся равномерно по выбранному периоду
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleBulkSchedule}
              disabled={scheduling}
              className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {scheduling ? "⟳ Планирую..." : "📅 Запланировать всё"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchStep({
  name, goal, product, audience, budget,
  selectedPlatforms, realPlatforms,
  landingId, landingPages,
  generatedCreatives, projectAgent,
  launchProgress, launching,
  step, setStep, handleLaunch,
}: {
  name: string; goal: string; product: string; audience: string; budget: string;
  selectedPlatforms: Set<string>; realPlatforms: any[];
  landingId: string | null; landingPages: any[];
  generatedCreatives: any[]; projectAgent: any;
  launchProgress: string; launching: boolean;
  step: number; setStep: (s: number) => void; handleLaunch: () => void;
}) {
  const [email, setEmail] = useState("");
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);

  const selectedLanding = landingId ? landingPages.find((l: any) => l.id === landingId) : null;
  const budgetNum = budget ? Number(budget) : null;

  const getExplanation = async () => {
    setExplaining(true);
    try {
      const res = await fetch("/api/ai/explain-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, goal,
          platforms: [...selectedPlatforms],
          budget: budgetNum,
          audience,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? "");
    } catch {
      setExplanation("Не удалось получить объяснение. Попробуйте ещё раз.");
    } finally {
      setExplaining(false);
    }
  };

  const inp = "w-full px-3 py-2 rounded-[7px] border border-line bg-panel-2 text-[12px] text-tx-1 outline-none focus:border-accent/50";

  return (
    <div className="flex gap-5 p-5">
      {/* Left — campaign summary (60%) */}
      <div className="flex-[3] min-w-0 space-y-4">
        {/* Name + goal */}
        <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-tx-1 leading-tight">{name || "Без названия"}</h2>
              <p className="text-[11px] text-tx-3 mt-0.5">{goal}</p>
            </div>
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-accent/10 text-[10px] font-medium text-accent border border-accent/20">Готово к запуску</span>
          </div>
          {product && <p className="text-[11px] text-tx-2 leading-relaxed">{product}</p>}
          {audience && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-tx-3">
              <span>👥</span>
              <span>{audience}</span>
            </div>
          )}
        </div>

        {/* Budget */}
        {budgetNum && (
          <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-tx-2">Бюджет кампании</span>
              <span className="text-[13px] font-semibold text-tx-1">{budgetNum.toLocaleString("ru")} ₽</span>
            </div>
            <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: "0%" }} />
            </div>
            <p className="text-[10px] text-tx-3 mt-1.5">Израсходовано 0 ₽ · Осталось {budgetNum.toLocaleString("ru")} ₽</p>
          </div>
        )}

        {/* Platforms */}
        {selectedPlatforms.size > 0 && (
          <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
            <p className="text-[11px] font-medium text-tx-2 mb-2.5">Платформы</p>
            <div className="flex flex-wrap gap-2">
              {[...selectedPlatforms].map((key) => {
                const rp = realPlatforms.find((p: any) => p.key === key);
                const meta = (PLATFORM_META as any)[key];
                const color = rp?.color ?? meta?.color ?? "#6366f1";
                const abbr = rp?.abbr ?? meta?.abbr ?? key.slice(0, 2).toUpperCase();
                const pname = rp?.name ?? meta?.name ?? key;
                return (
                  <div key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-line bg-panel text-[11px] text-tx-1">
                    <span className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[9px] font-bold text-white" style={{ background: color }}>{abbr}</span>
                    {pname}
                    {rp && <span className="text-[9px] text-tx-3">· подключён</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Landing preview */}
        {selectedLanding && (
          <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
            <p className="text-[11px] font-medium text-tx-2 mb-2">Лендинг</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-accent/10 border border-accent/20 flex items-center justify-center text-lg">🌐</div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-tx-1 truncate">{selectedLanding.title}</p>
                {selectedLanding.slug && (
                  <p className="text-[10px] text-tx-3 truncate">/l/{selectedLanding.slug}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Creatives count */}
        {generatedCreatives.length > 0 && (
          <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <div>
                <p className="text-[12px] font-medium text-tx-1">{generatedCreatives.length} {generatedCreatives.length === 1 ? "креатив" : "креатива"} готово</p>
                <p className="text-[10px] text-tx-3">Будут опубликованы при запуске</p>
              </div>
            </div>
          </div>
        )}

        {/* AI explanation */}
        <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
          {explanation ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">✦ AI-анализ</span>
              </div>
              <p className="text-[12px] text-tx-1 leading-relaxed">{explanation}</p>
              <button onClick={getExplanation} disabled={explaining} className="mt-2 text-[10px] text-tx-3 hover:text-accent cursor-pointer underline underline-offset-2">
                Обновить
              </button>
            </div>
          ) : (
            <button
              onClick={getExplanation}
              disabled={explaining}
              className="w-full py-2.5 border border-dashed border-accent/40 rounded-[8px] text-[12px] text-accent hover:bg-accent/5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {explaining ? "⟳ Анализирую кампанию..." : "✦ Объяснить кампанию"}
            </button>
          )}
        </div>

        {/* AI agent */}
        {projectAgent && (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-[8px]">
            <span className="text-sm">🤖</span>
            <p className="text-[11px] text-tx-2">AI-агент <span className="font-medium text-accent">{projectAgent.name}</span> будет отслеживать кампанию</p>
          </div>
        )}
      </div>

      {/* Right — approval + launch (40%) */}
      <div className="flex-[2] min-w-0 space-y-4">
        {/* Согласование */}
        <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
          <h3 className="text-[12px] font-semibold text-tx-1 mb-3">Согласовать с командой</h3>
          <p className="text-[11px] text-tx-3 mb-3 leading-relaxed">Отправьте ссылку на согласование руководителю или клиенту перед запуском.</p>
          <input
            type="email"
            placeholder="email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inp + " mb-2"}
          />
          <button
            onClick={() => alert("Функция в разработке — вскоре вы сможете отправлять кампании на согласование.")}
            className="w-full py-2 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
          >
            Отправить на согласование
          </button>
          <p className="text-[10px] text-tx-3 mt-2 text-center">Функция в разработке</p>
        </div>

        {/* Checklist */}
        <div className="p-4 bg-panel-2 border border-line rounded-[12px] space-y-2">
          <p className="text-[11px] font-medium text-tx-2 mb-3">Перед запуском</p>
          {[
            { ok: !!name.trim(), label: "Название кампании" },
            { ok: selectedPlatforms.size > 0, label: "Выбраны платформы" },
            { ok: !!budget, label: "Указан бюджет" },
            { ok: !!audience.trim(), label: "Описана аудитория" },
          ].map(({ ok, label }) => (
            <div key={label} className="flex items-center gap-2 text-[11px]">
              <span className={ok ? "text-green-500" : "text-tx-3"}>{ok ? "✓" : "○"}</span>
              <span className={ok ? "text-tx-1" : "text-tx-3"}>{label}</span>
            </div>
          ))}
        </div>

        {/* Launch */}
        <div className="p-4 bg-panel-2 border border-line rounded-[12px]">
          {launchProgress && (
            <p className="text-[11px] text-accent mb-3 text-center">{launchProgress}</p>
          )}
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="w-full py-3 bg-accent text-on-accent text-[13px] font-semibold rounded-[10px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
          >
            {launching ? "⟳ Запускаю..." : "🚀 Запустить кампанию"}
          </button>
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-2 py-2 text-[11px] text-tx-3 hover:text-tx-2 cursor-pointer"
          >
            ← Вернуться назад
          </button>
        </div>
      </div>
    </div>
  );
}

export function WizardView({
  onClose,
  projectId: defaultProjectId,
  onNameChange,
  tabId,
}: {
  onClose?: () => void;
  projectId?: string;
  onNameChange?: (name: string) => void;
  tabId?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const createCampaign = useCreateAdCampaign();
  const createCreative = useCreateAdCreative();

  const draft = loadDraft(tabId);

  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  // genMode kept for backward compat but not shown in UI
  const [genMode] = useState<"text" | "image" | "video">("text");
  const [step, setStep] = useState(draft?.step ?? 0);
  const [maxStep, setMaxStep] = useState(draft?.maxStep ?? draft?.step ?? 0);
  const [name, setName] = useState(draft?.name ?? "");

  const handleNameChange = (value: string) => {
    setName(value);
    onNameChange?.(value);
  };
  const [goal, setGoal] = useState(draft?.goal ?? "Продажи / заявки");
  const [product, setProduct] = useState(draft?.product ?? "");
  const [audience, setAudience] = useState(draft?.audience ?? "");
  const [budget, setBudget] = useState(draft?.budget ?? "");
  const [dateFrom, setDateFrom] = useState(draft?.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(draft?.dateTo ?? "");
  const [projectId, setProjectId] = useState(
    draft?.projectId ?? defaultProjectId ?? "",
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(draft?.platforms ?? []),
  );
  const [selectedSubtypes, setSelectedSubtypes] = useState<
    Record<string, Set<string>>
  >(
    Object.fromEntries(
      Object.entries(draft?.subtypes ?? {}).map(([k, v]: [string, any]) => [
        k,
        new Set(v),
      ]),
    ),
  );
  const [landingId, setLandingId] = useState<string | null>(draft?.landingId ?? null);
  const [landingDetailId, setLandingDetailId] = useState<string | null>(null);
  const [campaignTools, setCampaignTools] = useState<Set<string>>(() => {
    const tools = new Set<string>(draft?.campaignTools ?? []);
    if (draft?.landingId) tools.add("landing");
    return tools;
  });
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(draft?.selectedAgentId ?? null);
  const [budgetSuggesting, setBudgetSuggesting] = useState(false);
  const [budgetTip, setBudgetTip] = useState("");
  const [budgetRange, setBudgetRange] = useState<{ min: number; max: number } | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(draft?.draftId ?? null);

  // Launch state
  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState<string>("");
  const [error, setError] = useState("");

  // Schedule
  const [scheduleModal, setScheduleModal] = useState<{
    creativeId: string;
    platform: string;
    title: string;
  } | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [publishingNow, setPublishingNow] = useState<string | null>(null);

  // Generated creatives (real content from AI)
  const [generatedCreatives, setGeneratedCreatives] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creativePlatformFilter, setCreativePlatformFilter] = useState("all");
  const [creativeFilter, setCreativeFilter] = useState<string>("all");

  // Connect platform inline
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [accountIdInput, setAccountIdInput] = useState("");
  const [connectingPlatform, setConnectingPlatform] = useState(false);

  const [projectOpen, setProjectOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectNiche, setNewProjectNiche] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [nicheSearch, setNicheSearch] = useState("");
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);

  // Campaign-level niche in Goal step
  const [campaignNiche, setCampaignNiche] = useState<string>(draft?.campaignNiche ?? "");
  const [goalNicheSearch, setGoalNicheSearch] = useState("");
  const [goalNicheOpen, setGoalNicheOpen] = useState(false);
  const [budgetError, setBudgetError] = useState("");

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null,
  );

  // Content plan step
  const [contentPlan, setContentPlan] = useState<any>(null);
  const [contentPlanLoading, setContentPlanLoading] = useState(false);
  const [contentPlanError, setContentPlanError] = useState("");
  const [contentPlanApproved, setContentPlanApproved] = useState(false);
  const [activeContentSection, setActiveContentSection] = useState<"social" | "ads">("social");

  const imgRef = useRef<HTMLInputElement>(null);
  const productImgRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      return res.ok ? res.json() : [];
    },
  });

  const { data: existingCampaigns = [] } = useQuery({
    queryKey: ["ad_campaigns_clone"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns?limit=20");
      return res.ok ? res.json() : [];
    },
  });

  const { data: connectedAdPlatforms = [], refetch: refetchPlatforms } =
    useQuery({
      queryKey: ["ad_platforms_real"],
      queryFn: async () => {
        const res = await fetch("/api/ad-platforms");
        if (!res.ok) return [];
        const data = await res.json();
        return (data ?? []).filter((p: any) => p.is_active);
      },
    });

  const { data: connectedIntegrations = [], refetch: refetchIntegrations } =
    useQuery({
      queryKey: ["integrations_real"],
      queryFn: async () => {
        const res = await fetch("/api/integrations");
        if (!res.ok) return [];
        const data = await res.json();
        return (data ?? []).filter((i: any) => i.is_active);
      },
    });

  // Build real platforms
  type RealPlatform = {
    key: string;
    name: string;
    abbr: string;
    color: string;
    textColor?: string;
    accountInfo: string;
    channels: string[];
  };

  const realPlatforms: RealPlatform[] = (() => {
    const result: RealPlatform[] = [];
    const seen = new Set<string>();
    for (const p of connectedAdPlatforms) {
      if (seen.has(p.platform_key)) continue;
      seen.add(p.platform_key);
      const meta = PLATFORM_META[p.platform_key] ?? {
        color: p.color ?? "#888",
        abbr: p.abbr ?? "?",
        name: p.name,
      };
      result.push({
        key: p.platform_key,
        name: meta.name,
        abbr: meta.abbr,
        color: meta.color,
        textColor: (meta as any).textColor,
        accountInfo: p.account_name ?? p.account_id ?? "Подключён",
        channels: [],
      });
    }
    const integByPlatform: Record<string, string[]> = {};
    for (const i of connectedIntegrations) {
      if (!integByPlatform[i.platform]) integByPlatform[i.platform] = [];
      integByPlatform[i.platform].push(`@${i.channel_name}`);
    }
    for (const [platform, channels] of Object.entries(integByPlatform)) {
      if (seen.has(platform)) {
        const existing = result.find((r) => r.key === platform);
        if (existing) existing.channels = channels;
      } else {
        seen.add(platform);
        const meta = PLATFORM_META[platform];
        if (meta)
          result.push({
            key: platform,
            name: meta.name,
            abbr: meta.abbr,
            color: meta.color,
            textColor: (meta as any).textColor,
            accountInfo: channels.join(", "),
            channels,
          });
      }
    }
    return result;
  })();

  const connectedKeys = new Set(realPlatforms.map((p) => p.key));

  // AI agents
  const { data: aiAgents = [] } = useQuery({
    queryKey: ["ai_agents_wizard"],
    queryFn: async () => {
      const res = await fetch("/api/ai-agents");
      if (!res.ok) return [];
      const data = await res.json();
      return (data ?? []).filter((a: any) => a.is_active);
    },
  });

  // Derived from projects + aiAgents (no extra query needed)
  const projectAgent = (() => {
    if (!projectId) return null;
    const proj = (projects as any[]).find((p: any) => p.id === projectId);
    if (!proj?.ai_agent_id) return null;
    return (aiAgents as any[]).find((a: any) => a.id === proj.ai_agent_id) ?? null;
  })();

  const { data: landingPages = [] } = useQuery({
    queryKey: ["landings_wizard"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch("/api/landings");
      if (!res.ok) return [];
      const data = await res.json();
      return data ?? [];
    },
  });

  // Autosave draft to localStorage + create draft in DB
  useEffect(() => {
    const subtypesSer = Object.fromEntries(
      Object.entries(selectedSubtypes).map(([k, v]) => [k, [...v]]),
    );
    saveDraft(
      {
        genMode,
        name,
        goal,
        product,
        audience,
        budget,
        dateFrom,
        dateTo,
        projectId,
        platforms: [...selectedPlatforms],
        subtypes: subtypesSer,
        draftId,
        landingId,
        campaignTools: [...campaignTools],
        step,
        maxStep,
        campaignNiche,
      },
      tabId,
    );
    if (name) {
      setAutoSaved(true);
      const t = setTimeout(() => setAutoSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [
    genMode,
    name,
    goal,
    product,
    audience,
    budget,
    dateFrom,
    dateTo,
    projectId,
    selectedPlatforms,
    selectedSubtypes,
    landingId,
    campaignTools,
    step,
    maxStep,
  ]);

  // Auto-create draft in DB when name is entered
  useEffect(() => {
    if (!name.trim() || draftId) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            goal,
            status: "draft",
            budget_spent: 0,
            impressions: 0,
            clicks: 0,
            leads: 0,
            sales: 0,
            revenue: 0,
            ctr: 0,
            cpl: 0,
            roas: 0,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setDraftId(data.id);
          qc.invalidateQueries({ queryKey: ["ad_campaigns"] });
        }
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [name]);

  // Update draft in DB when fields change
  useEffect(() => {
    if (!draftId) return;
    const timer = setTimeout(async () => {
      await fetch(`/api/campaigns/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Черновик",
          goal,
          description: product,
          platforms: [...selectedPlatforms],
          budget_total: budget ? Number(budget) : null,
          project_id: projectId || null,
          landing_id: landingId ?? null,
        }),
      });
      qc.invalidateQueries({ queryKey: ["ad_campaigns"] });
    }, 800);
    return () => clearTimeout(timer);
  }, [name, goal, product, budget, projectId, selectedPlatforms, draftId, landingId]);

  const activeProject = projects.find((p: any) => p.id === projectId) as any;

  // AI project recommendations + autofill
  const [projectRecs, setProjectRecs] = useState<string[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  // Dynamic steps based on selected tools
  const activeSteps = ALL_STEP_DEFS.filter(s => {
    if (s.key === "goal" || s.key === "platforms" || s.key === "launch") return true;
    if (s.key === "landing") return campaignTools.has("landing");
    if (s.key === "content") return campaignTools.has("creatives") || campaignTools.has("content") || selectedPlatforms.size > 0;
    return false;
  });
  const currentStepKey = activeSteps[step]?.key ?? "goal";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (step >= activeSteps.length) setStep(0);
  }, [campaignTools]);

  const suggestBudget = async () => {
    setBudgetSuggesting(true);
    setBudgetTip("");
    setBudgetRange(null);
    setBudgetError("");
    try {
      const days = dateFrom && dateTo ? Math.max(1, Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000)) : 30;
      const res = await fetch("/api/ai/suggest-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, niche: campaignNiche || (activeProject as any)?.niche, audience, platforms: Array.from(selectedPlatforms), days }),
      });
      if (!res.ok) throw new Error("Ошибка сервера — попробуйте снова");
      const data = await res.json();
      if (data.recommended) setBudget(String(data.recommended));
      if (data.min && data.max) setBudgetRange({ min: data.min, max: data.max });
      if (data.explanation) setBudgetTip(data.explanation);
      else if (data.tip) setBudgetTip(data.tip);
    } catch (e: any) {
      setBudgetError(e.message || "Не удалось получить AI совет");
    } finally {
      setBudgetSuggesting(false);
    }
  };

  const generateContentPlan = async () => {
    setContentPlanLoading(true);
    setContentPlanError("");
    setContentPlan(null);
    setContentPlanApproved(false);
    try {
      const res = await fetch("/api/ai/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: campaignNiche || (activeProject as any)?.niche,
          goal,
          product,
          audience,
          budget,
          dateFrom,
          dateTo,
          platforms: [...selectedPlatforms],
        }),
      });
      if (!res.ok) throw new Error("Ошибка сервера");
      const data = await res.json();
      setContentPlan(data);
    } catch (e: any) {
      setContentPlanError(e.message || "Не удалось создать план");
    } finally {
      setContentPlanLoading(false);
    }
  };

  const autofillFromProject = async (project: any) => {
    if (!project) return;
    setAutofilling(true);
    try {
      const res = await fetch("/api/ai/autofill-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          niche: campaignNiche || project.niche,
          description: project.description,
          audience: project.audience,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.name) handleNameChange(data.name);
      if (data.goal) setGoal(data.goal);
      if (data.product) setProduct(data.product);
      if (data.audience) setAudience(data.audience);
    } catch {
      // silent fail — user can fill manually
    } finally {
      setAutofilling(false);
    }
  };

  const generateProjectRecs = async (project: any) => {
    if (!project) return;
    setLoadingRecs(true);
    setProjectRecs([]);
    try {
      const prompt = `Проанализируй проект и дай 3 конкретные краткие рекомендации для рекламной кампании.

Проект: ${project.name}
Ниша: ${project.niche ?? "не указана"}
Описание: ${project.description ?? "не указано"}
Аудитория: ${project.audience ?? "не указана"}

Ответь ТОЛЬКО в JSON формате без markdown:
{"recs":["рекомендация 1","рекомендация 2","рекомендация 3"]}

Каждая рекомендация — одно конкретное действие для кампании, до 15 слов.`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, max_tokens: 300 }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setProjectRecs(parsed.recs ?? []);
    } catch {
      setProjectRecs([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleProjectSelect = (pid: string) => {
    setProjectId(pid);
    setProjectOpen(false);
    const p = projects.find((p: any) => p.id === pid) as any;
    if (!p) return;
    setProjectRecs([]);
    generateProjectRecs(p);
    autofillFromProject(p);
  };

  // Reset recs when projectId cleared
  useEffect(() => {
    if (!projectId) setProjectRecs([]);
  }, [projectId]);

  const handleClone = (c: any) => {
    setName(`${c.name} — копия`);
    setGoal(c.goal ?? "Продажи / заявки");
    setProduct(c.description ?? "");
    setBudget(c.budget_total ? String(c.budget_total) : "");
    const clonePlatforms = (c.platforms ?? []).filter((p: string) =>
      connectedKeys.has(p),
    );
    setSelectedPlatforms(new Set(clonePlatforms));
    setCloneOpen(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          niche: newProjectNiche.trim() || null,
          language: "ru",
          tone: "friendly",
        }),
      });
      if (!res.ok) throw new Error("Ошибка создания проекта");
      const data = await res.json();
      await refetchProjects();
      setProjectId(data.id);
      setShowCreateProject(false);
      setNewProjectName("");
      setNewProjectNiche("");
      setNicheSearch("");
      setNicheDropdownOpen(false);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleConnectPlatform = async () => {
    if (!connectModal) return;
    setConnectingPlatform(true);
    try {
      const meta = PLATFORM_META[connectModal];
      const res = await fetch("/api/ad-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_key: connectModal,
          name: meta?.name ?? connectModal,
          color: meta?.color ?? "#888",
          abbr: meta?.abbr ?? "?",
          token: tokenInput || null,
          ad_account_id: accountIdInput || null,
        }),
      });
      if (!res.ok) throw new Error("Ошибка подключения платформы");
      await refetchPlatforms();
      setConnectModal(null);
      setTokenInput("");
      setAccountIdInput("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setConnectingPlatform(false);
    }
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
        setSelectedSubtypes((s) => {
          const ns = { ...s };
          delete ns[key];
          return ns;
        });
      } else {
        n.add(key);
        const subs = PLATFORM_SUBTYPES[key] ?? [];
        setSelectedSubtypes((s) => ({
          ...s,
          [key]: new Set(subs.map((st) => st.value)),
        }));
      }
      return n;
    });
  };

  const toggleSubtype = (platformKey: string, subtype: string) => {
    setSelectedSubtypes((prev) => {
      const current = new Set(prev[platformKey] ?? []);
      current.has(subtype) ? current.delete(subtype) : current.add(subtype);
      if (current.size === 0) return prev;
      return { ...prev, [platformKey]: current };
    });
  };

  const generateAllCreatives = async () => {
    setGenerating(true);
    const days = dateFrom && dateTo
      ? Math.max(1, Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000))
      : 0;
    const perType = days > 0 ? (days < 7 ? 1 : days < 30 ? 2 : 3) : 2;
    const tasks: Promise<any>[] = [];
    let vi = 0;
    for (const platformKey of selectedPlatforms) {
      const rp = realPlatforms.find((p) => p.key === platformKey);
      const subs = selectedSubtypes[platformKey] ?? new Set();
      for (const subtype of subs) {
        for (let i = 0; i < perType; i++) {
          const currentVi = vi++;
          const id = `${platformKey}__${subtype}__${currentVi}__${i}`;
          tasks.push(
            generateCreativeContent({
              platform: platformKey,
              subtype,
              product: product || (activeProject as any)?.description || "",
              goal,
              audience,
              projectName: (activeProject as any)?.name ?? name,
              niche: (activeProject as any)?.niche ?? "",
              tone: (activeProject as any)?.tone ?? "",
              keywords: (activeProject as any)?.keywords ?? "",
              budget: budget ?? "",
              variationIndex: currentVi,
            })
              .then((content) => ({ id, platform: platformKey, subtype, ...content, rp }))
              .catch(() => null)
          );
        }
      }
    }
    const results = await Promise.all(tasks);
    setGeneratedCreatives(results.filter(Boolean));
    setGenerating(false);
  };

  const generateFromPlan = async () => {
    if (!contentPlan) return;
    setGenerating(true);
    setGeneratedCreatives([]);
    const tasks: Promise<any>[] = [];
    let vi = 0;

    const socialData = contentPlan.socialMedia ?? {};
    for (const [platformKey, data] of Object.entries(socialData)) {
      const formats = Object.entries(data as Record<string, any>).filter(
        ([k, v]) => k !== "reasoning" && typeof v === "number"
      );
      for (const [subtype, count] of formats) {
        for (let i = 0; i < (count as number); i++) {
          const currentVi = vi++;
          const id = `${platformKey}__${subtype}__${currentVi}`;
          tasks.push(
            generateCreativeContent({
              platform: platformKey,
              subtype,
              product: product || (activeProject as any)?.description || "",
              goal,
              audience,
              projectName: (activeProject as any)?.name ?? name,
              niche: (activeProject as any)?.niche ?? "",
              tone: (activeProject as any)?.tone ?? "",
              keywords: (activeProject as any)?.keywords ?? "",
              budget: budget ?? "",
              variationIndex: currentVi,
            })
              .then((content) => ({ id, platform: platformKey, subtype, ...content }))
              .catch(() => null)
          );
        }
      }
    }

    const adData = contentPlan.adPlatforms ?? {};
    for (const [platformKey, data] of Object.entries(adData)) {
      const formats = Object.entries(data as Record<string, any>).filter(
        ([k, v]) => k !== "reasoning" && typeof v === "number"
      );
      for (const [subtype, count] of formats) {
        for (let i = 0; i < (count as number); i++) {
          const currentVi = vi++;
          const id = `${platformKey}__${subtype}__${currentVi}`;
          tasks.push(
            generateCreativeContent({
              platform: platformKey,
              subtype,
              product: product || (activeProject as any)?.description || "",
              goal,
              audience,
              projectName: (activeProject as any)?.name ?? name,
              niche: (activeProject as any)?.niche ?? "",
              tone: (activeProject as any)?.tone ?? "",
              keywords: (activeProject as any)?.keywords ?? "",
              budget: budget ?? "",
              variationIndex: currentVi,
            })
              .then((content) => ({ id, platform: platformKey, subtype, ...content }))
              .catch(() => null)
          );
        }
      }
    }

    const results = await Promise.all(tasks);
    setGeneratedCreatives(results.filter(Boolean));
    setGenerating(false);
  };

  const handleGoToCreatives = () => {
    const pos = activeSteps.findIndex(s => s.key === "content");
    const target = pos !== -1 ? pos : activeSteps.length - 1;
    setStep(target);
    setMaxStep((prev: number) => Math.max(prev, target));
  };

  // Generate ALL creatives via Claude API then save to DB
  const handleLaunch = async () => {
    if (!name.trim()) {
      setError("Введите название");
      return;
    }
    if (selectedPlatforms.size === 0) {
      setError("Выберите платформу");
      return;
    }
    setLaunching(true);
    setError("");

    try {
      // Update or create campaign
      let campaignId = draftId;
      if (campaignId) {
        await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            goal,
            description: product,
            platforms: [...selectedPlatforms],
            status: "active",
            budget_total: budget ? Number(budget) : null,
            project_id: projectId || null,
            landing_id: landingId ?? null,
          }),
        });
      } else {
        const campaign = await createCampaign.mutateAsync({
          name,
          goal,
          description: product,
          platforms: [...selectedPlatforms],
          status: "active",
          budget_total: budget ? Number(budget) : undefined,
          budget_spent: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          sales: 0,
          revenue: 0,
          ctr: 0,
          cpl: 0,
          roas: 0,
          project_id: projectId || undefined,
          landing_id: landingId ?? undefined,
        });
        campaignId = campaign.id;
      }

      qc.invalidateQueries({ queryKey: ["ad_campaigns"] });

      // Save already generated creatives to DB (don't regenerate)
      const allCreatives: any[] = [];
      setLaunchProgress(`Сохраняю ${generatedCreatives.length} креативов...`);
      for (const c of generatedCreatives) {
        try {
          const res = await fetch("/api/ad-creatives", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaign_id: campaignId,
              project_id: projectId || null,
              platform: c.platform,
              format: c.subtype,
              title: c.title,
              caption: c.caption,
              status: "draft",
              ai_generated: true,
              ctr: 0,
              impressions: 0,
              clicks: 0,
              is_winner: false,
            }),
          });
          if (res.ok) allCreatives.push(await res.json());
        } catch (e) {
          console.error("Save creative error:", e);
        }
      }

      qc.invalidateQueries({ queryKey: ["ad_creatives"] });
      setGeneratedCreatives(allCreatives);
      clearDraft(tabId);
      setDraftId(null);
      setLaunchProgress("");

      // Go to campaign page
      router.push(`/${locale}/campaigns/${campaignId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLaunching(false);
      setLaunchProgress("");
    }
  };

  const handleScheduleCreative = async () => {
    if (!scheduleModal || !scheduleTime) return;
    setScheduling(true);
    try {
      await fetch("/api/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: scheduleModal.creativeId,
          platform: scheduleModal.platform,
          scheduled_at: new Date(scheduleTime).toISOString(),
          status: "pending",
          retry_count: 0,
        }),
      });
      await fetch(`/api/ad-creatives/${scheduleModal.creativeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      setScheduleModal(null);
      setScheduleTime("");
      alert("Запланировано!");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  return (
    <div>
      {/* Step bar */}
      <div className="flex items-center gap-1 bg-panel-2 border border-line rounded-[9px] p-2.5 mb-5 overflow-x-auto">
        {activeSteps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <button
              onClick={() => { if (i <= maxStep) setStep(i); }}
              style={{ cursor: i <= maxStep ? "pointer" : "default" }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${step === i ? "bg-accent text-on-accent" : i < maxStep ? "bg-chip text-pos hover:bg-chip/70" : i <= maxStep ? "bg-panel text-tx-2 hover:bg-hover" : "bg-panel text-tx-3 opacity-50"}`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${step === i ? "bg-white/20" : i < maxStep ? "bg-pos text-white" : "border border-line text-tx-3"}`}
              >
                {i < maxStep ? "✓" : i + 1}
              </div>
              {s.label}
            </button>
            {i < activeSteps.length - 1 && (
              <span className="text-tx-3 text-[10px]">›</span>
            )}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-4">
          {(activeProject as any) && (
            <button
              onClick={() => setProjectOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 10, color: "var(--tx-3)" }}>📁</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                {(activeProject as any).name}
              </span>
              <span style={{ fontSize: 10, color: "var(--tx-3)" }}>
                ↻ сменить
              </span>
            </button>
          )}
          {!(activeProject as any) && (
            <button
              onClick={() => setProjectOpen(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                color: "var(--tx-3)",
                fontFamily: "inherit",
              }}
            >
              📁 Выбрать проект
            </button>
          )}
          {autoSaved && (
            <span style={{ fontSize: 10, color: "var(--pos)" }}>
              ✓ Черновик сохранён
            </span>
          )}
          {draftId && !autoSaved && (
            <span style={{ fontSize: 10, color: "var(--tx-3)" }}>Черновик</span>
          )}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-neg bg-panel-2 border border-line rounded-[8px] px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* ══ STEP 0: Goal ══ */}
      {currentStepKey === "goal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            {/* Project selector block — always visible above Название */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setProjectOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 12px",
                  border: `0.5px solid ${activeProject ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 9,
                  background: activeProject ? "var(--chip)" : "var(--panel-2)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left" as const,
                  transition: "border-color 0.15s",
                }}
              >
                {activeProject ? (
                  <>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "var(--accent)", color: "var(--on-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(activeProject as any).name.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>{(activeProject as any).name}</p>
                      {(activeProject as any).niche && <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginTop: 1 }}>{(activeProject as any).niche}</p>}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--tx-3)", flexShrink: 0 }}>↻ Сменить</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>📁</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--tx-1)", margin: 0 }}>Выберите проект</p>
                      <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginTop: 1 }}>Бренд, описание и аудитория подтянутся автоматически</p>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, flexShrink: 0 }}>Выбрать →</span>
                  </>
                )}
              </button>
              {projectOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 49 }}
                    onClick={() => setProjectOpen(false)}
                  />
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    zIndex: 50, background: "var(--panel)", border: "0.5px solid var(--line)",
                    borderRadius: 10, padding: 6, maxHeight: 260, overflowY: "auto",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  }}>
                    {(projects as any[]).length === 0 ? (
                      <p style={{ fontSize: 11, color: "var(--tx-3)", padding: "10px", textAlign: "center" }}>Нет проектов</p>
                    ) : (
                      (projects as any[]).map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { handleProjectSelect(p.id); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            width: "100%", padding: "8px 10px", borderRadius: 7,
                            border: "none", background: projectId === p.id ? "var(--chip)" : "none",
                            color: "var(--tx-1)", fontSize: 12, cursor: "pointer",
                            fontFamily: "inherit", textAlign: "left",
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--hover)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = projectId === p.id ? "var(--chip)" : "none")}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 5,
                            background: "var(--accent)", color: "var(--on-accent)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {p.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                            {p.niche && <p style={{ margin: 0, fontSize: 10, color: "var(--tx-3)", marginTop: 1 }}>{p.niche}</p>}
                          </div>
                        </button>
                      ))
                    )}
                    <div style={{ borderTop: "0.5px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => { setShowCreateProject(true); setProjectOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", background: "none", color: "var(--accent)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                      >
                        <span style={{ fontSize: 16 }}>+</span> Создать новый проект
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Inline create project form */}
            {showCreateProject && (
              <div style={{ padding: 14, border: "0.5px solid var(--accent)", borderRadius: 10, background: "var(--chip)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>Новый проект</p>
                  <button type="button" onClick={() => { setShowCreateProject(false); setNewProjectName(""); setNewProjectNiche(""); setNicheSearch(""); setNicheDropdownOpen(false); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 16, padding: 0 }}>✕</button>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: "var(--tx-3)", display: "block", marginBottom: 4 }}>Название *</label>
                  <input
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Название проекта"
                    className={inp}
                  />
                </div>
                <div style={{ marginBottom: 12, position: "relative" }}>
                  <label style={{ fontSize: 11, color: "var(--tx-3)", display: "block", marginBottom: 4 }}>Ниша</label>
                  {newProjectNiche && !nicheDropdownOpen ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--accent)", background: "var(--panel)", cursor: "pointer" }}
                      onClick={() => { setNicheSearch(""); setNicheDropdownOpen(true); }}>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{newProjectNiche}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setNewProjectNiche(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 14, padding: 0 }}>✕</button>
                    </div>
                  ) : (
                    <div>
                      <input
                        value={nicheSearch}
                        onChange={e => { setNicheSearch(e.target.value); setNicheDropdownOpen(true); }}
                        onFocus={() => setNicheDropdownOpen(true)}
                        placeholder="🔍 Поиск ниши — кофейня, IT, авто..."
                        className={inp}
                        autoComplete="off"
                      />
                      {nicheDropdownOpen && (
                        <>
                          <div style={{ position: "fixed", inset: 0, zIndex: 59 }} onClick={() => setNicheDropdownOpen(false)} />
                          <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                            zIndex: 60, background: "var(--panel)", border: "0.5px solid var(--line)",
                            borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                            maxHeight: 240, overflowY: "auto",
                          }}>
                            {WIZARD_NICHE_TREE
                              .flatMap(n => {
                                const q = nicheSearch.toLowerCase();
                                const parentMatch = n.label.toLowerCase().includes(q);
                                const matchedSubs = n.subs.filter(s => !q || s.toLowerCase().includes(q) || parentMatch);
                                const items: { icon: string; parent: string; sub: string }[] = matchedSubs.map(s => ({ icon: n.icon, parent: n.label, sub: s }));
                                if (n.subs.length === 0 && (!q || parentMatch)) items.push({ icon: n.icon, parent: "", sub: n.label });
                                return items;
                              })
                              .slice(0, 15)
                              .map(item => (
                                <button key={item.sub} type="button"
                                  onClick={() => { setNewProjectNiche(item.sub); setNicheSearch(""); setNicheDropdownOpen(false); }}
                                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "var(--hover)")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                                  <div>
                                    {item.parent && <span style={{ fontSize: 10, color: "var(--tx-3)" }}>{item.parent} / </span>}
                                    <span style={{ fontSize: 12, color: "var(--tx-1)", fontWeight: 500 }}>{item.sub}</span>
                                  </div>
                                </button>
                              ))
                            }
                            {WIZARD_NICHE_TREE.flatMap(n => { const q = nicheSearch.toLowerCase(); const parentMatch = n.label.toLowerCase().includes(q); return [...n.subs.filter(s => !q || s.toLowerCase().includes(q) || parentMatch), ...(n.subs.length === 0 && (!q || parentMatch) ? [n.label] : [])]; }).length === 0 && (
                              <p style={{ fontSize: 11, color: "var(--tx-3)", padding: "10px 12px", margin: 0 }}>Ничего не найдено</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button"
                    onClick={() => { setShowCreateProject(false); setNewProjectName(""); setNewProjectNiche(""); setNicheSearch(""); setNicheDropdownOpen(false); }}
                    style={{ flex: 1, padding: "9px", borderRadius: 7, border: "0.5px solid var(--line)", background: "transparent", color: "var(--tx-2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                  >Отмена</button>
                  <button type="button" onClick={handleCreateProject}
                    disabled={creatingProject || !newProjectName.trim()}
                    style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: (creatingProject || !newProjectName.trim()) ? 0.6 : 1 }}
                  >{creatingProject ? "Создаю..." : "Создать"}</button>
                </div>
              </div>
            )}

            {/* Autofill banner */}
            {autofilling && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--chip)", border: "0.5px solid var(--line)",
              }}>
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span style={{ fontSize: 11, color: "var(--tx-2)" }}>
                  ✦ AI анализирует проект и заполняет поля...
                </span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block ui-label mb-1">Название *</label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Ramadan акция 2026"
                className={inp}
              />
            </div>

            {/* Clone campaign */}
            <div>
              <label className="block ui-label mb-1">
                Клонировать кампанию
              </label>
              <Dropdown
                label="Выбрать существующую..."
                icon={<span>📋</span>}
                open={cloneOpen}
                onToggle={() => {
                  setCloneOpen(!cloneOpen);
                  setProjectOpen(false);
                }}
              >
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {existingCampaigns.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleClone(c)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-[7px] cursor-pointer hover:bg-hover text-left"
                    >
                      <div className="flex gap-1 flex-shrink-0">
                        {(c.platforms ?? []).slice(0, 2).map((pid: string) => {
                          const pm = PLATFORM_META[pid];
                          return pm ? (
                            <div
                              key={pid}
                              style={{
                                width: 18,
                                height: 13,
                                borderRadius: 2,
                                background: pm.color,
                                color: (pm as any).textColor ?? "#fff",
                                fontSize: 7,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {pm.abbr}
                            </div>
                          ) : null;
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-tx-1 truncate">
                          {c.name}
                        </p>
                        {c.goal && (
                          <p className="text-[10px] text-tx-3">{c.goal}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {existingCampaigns.length === 0 && (
                    <p className="text-[11px] text-tx-3 px-2 py-1">
                      Нет кампаний
                    </p>
                  )}
                </div>
              </Dropdown>
            </div>

            {/* Goal */}
            <div>
              <label className="block ui-label mb-2">Цель</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`px-3 py-1.5 rounded-[7px] text-[11px] border cursor-pointer transition-colors ${goal === g ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
                  >
                    {g}
                  </button>
                ))}
                <button
                  onClick={() => { if (PRESET_GOALS.includes(goal)) setGoal(""); }}
                  className={`px-3 py-1.5 rounded-[7px] text-[11px] border cursor-pointer transition-colors ${!PRESET_GOALS.includes(goal) ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
                >
                  ✏️ Своя
                </button>
              </div>
              {!PRESET_GOALS.includes(goal) && (
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Введите свою цель..."
                  autoFocus
                  className={`${inp} mt-2`}
                />
              )}
            </div>

            {/* Niche search */}
            <div style={{ position: "relative" }}>
              <label className="block ui-label mb-1">Ниша</label>
              <div
                style={{ position: "relative" }}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setGoalNicheOpen(false); }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={goalNicheOpen ? goalNicheSearch : (campaignNiche || goalNicheSearch)}
                    onChange={(e) => { setGoalNicheSearch(e.target.value); setGoalNicheOpen(true); if (!e.target.value) setCampaignNiche(""); }}
                    onFocus={() => { setGoalNicheOpen(true); setGoalNicheSearch(""); }}
                    placeholder={campaignNiche || "Поиск ниши — ресторан, IT, одежда..."}
                    className={inp}
                    style={{ paddingRight: 32 }}
                  />
                  {campaignNiche && (
                    <button
                      type="button"
                      onClick={() => { setCampaignNiche(""); setGoalNicheSearch(""); }}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 14, lineHeight: 1, padding: 2 }}
                    >×</button>
                  )}
                </div>
                {goalNicheOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 220, overflowY: "auto" }}>
                    {WIZARD_NICHE_TREE.flatMap(n => {
                      const q = goalNicheSearch.toLowerCase();
                      const parentMatch = n.label.toLowerCase().includes(q);
                      const subs = n.subs.filter(s => !q || s.toLowerCase().includes(q) || parentMatch);
                      return subs.map(s => ({ icon: n.icon, parent: n.label, sub: s }))
                        .concat(n.subs.length === 0 && (!q || parentMatch) ? [{ icon: n.icon, parent: "", sub: n.label }] : []);
                    }).slice(0, 40).map(item => (
                      <button
                        key={`${item.parent}/${item.sub}`}
                        type="button"
                        tabIndex={0}
                        onMouseDown={(e) => { e.preventDefault(); const val = item.parent ? `${item.parent} / ${item.sub}` : item.sub; setCampaignNiche(val); setGoalNicheSearch(""); setGoalNicheOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          {item.parent && <span style={{ fontSize: 10, color: "var(--tx-3)" }}>{item.parent} / </span>}
                          <span style={{ fontSize: 12, color: "var(--tx-1)", fontWeight: 500 }}>{item.sub}</span>
                        </div>
                      </button>
                    ))}
                    {WIZARD_NICHE_TREE.flatMap(n => {
                      const q = goalNicheSearch.toLowerCase();
                      const parentMatch = n.label.toLowerCase().includes(q);
                      return n.subs.filter(s => !q || s.toLowerCase().includes(q) || parentMatch);
                    }).length === 0 && (
                      <p style={{ fontSize: 11, color: "var(--tx-3)", padding: "10px 12px", margin: 0 }}>Ничего не найдено</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Product */}
            <div>
              <label className="block ui-label mb-1">О продукте — для AI</label>
              <textarea
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Опишите продукт, преимущества, акции..."
                className={`${inp} resize-none h-16`}
              />
            </div>

            {/* Audience */}
            <div>
              <label className="block ui-label mb-1">Целевая аудитория</label>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Возраст, интересы, гео..."
                className={`${inp} resize-none h-12`}
              />
            </div>

            {/* Budget */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label className="block ui-label">Бюджет (₽)</label>
                <button
                  type="button"
                  onClick={suggestBudget}
                  disabled={budgetSuggesting}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, border: "0.5px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: budgetSuggesting ? 0.6 : 1 }}
                >
                  {budgetSuggesting ? "⟳ Считаю..." : "✦ AI совет"}
                </button>
              </div>
              <input
                type="number"
                value={budget}
                onChange={(e) => { setBudget(e.target.value); setBudgetTip(""); setBudgetRange(null); setBudgetError(""); }}
                placeholder="150000"
                className={inp}
              />
              {(budgetTip || budgetRange) && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--panel-2)", border: "0.5px solid var(--line)", borderRadius: 8 }}>
                  {budgetRange && (
                    <div style={{ display: "flex", gap: 12, marginBottom: budgetTip ? 8 : 0 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <p style={{ fontSize: 9, color: "var(--tx-3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Минимум</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-2)" }}>{budgetRange.min.toLocaleString("ru")} ₽</p>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", borderLeft: "0.5px solid var(--line)", borderRight: "0.5px solid var(--line)" }}>
                        <p style={{ fontSize: 9, color: "var(--accent)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Рекомендуем</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{Number(budget).toLocaleString("ru")} ₽</p>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <p style={{ fontSize: 9, color: "var(--tx-3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Максимум</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-2)" }}>{budgetRange.max.toLocaleString("ru")} ₽</p>
                      </div>
                    </div>
                  )}
                  {budgetTip && (
                    <p style={{ fontSize: 11, color: "var(--tx-2)", lineHeight: 1.6, margin: 0 }}>
                      <span style={{ color: "var(--accent)", marginRight: 4 }}>✦</span>{budgetTip}
                    </p>
                  )}
                </div>
              )}
              {budgetError && (
                <p style={{ fontSize: 10, color: "var(--neg)", marginTop: 4 }}>⚠ {budgetError}</p>
              )}
            </div>

            {/* Deadline / period */}
            <div>
              <label className="block ui-label mb-1">Период кампании</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={inp}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 11, color: "var(--tx-3)", flexShrink: 0 }}>—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inp}
                  style={{ flex: 1 }}
                />
              </div>
              {dateFrom && dateTo && (() => {
                const days = Math.max(1, Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000));
                const postsPerType = days < 7 ? 1 : days < 30 ? 2 : 3;
                return (
                  <p style={{ fontSize: 10, color: "var(--tx-3)", marginTop: 4 }}>
                    {days} дн. · AI сгенерирует по {postsPerType} поста на каждый тип
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Right: tools + project images */}
          <div className="space-y-4">
            {/* Campaign tools checkboxes */}
            <div>
              <label className="block ui-label mb-2">Инструменты кампании</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { key: "landing", label: "Лендинг", icon: "🌐" },
                  { key: "ai_agent", label: "AI-агент", icon: "🤖" },
                  { key: "creatives", label: "Рекламные креативы", icon: "🎨" },
                  { key: "content", label: "Контент для соцсетей", icon: "📝" },
                ].map((tool) => {
                  const checked = campaignTools.has(tool.key);
                  return (
                    <div key={tool.key}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${checked ? "var(--accent)" : "var(--line)"}`, background: checked ? "var(--chip)" : "transparent", transition: "all 0.15s" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(campaignTools);
                            if (checked) { next.delete(tool.key); if (tool.key === "ai_agent") { setSelectedAgentId(null); } }
                            else { next.add(tool.key); }
                            setCampaignTools(next);
                          }}
                          style={{ accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 14 }}>{tool.icon}</span>
                        <span style={{ fontSize: 12, color: "var(--tx-1)", fontWeight: checked ? 500 : 400 }}>{tool.label}</span>
                      </label>
                      {tool.key === "ai_agent" && checked && (
                        <div style={{ marginTop: 6, marginLeft: 10, padding: 10, background: "var(--panel-2)", borderRadius: 8, border: "0.5px solid var(--line)" }}>
                          <p style={{ fontSize: 10, color: "var(--tx-3)", marginBottom: 8 }}>Выберите AI-агента:</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                            {(aiAgents as any[]).map((a: any) => (
                              <button key={a.id} type="button" onClick={() => setSelectedAgentId(selectedAgentId === a.id ? null : a.id)}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, border: `0.5px solid ${selectedAgentId === a.id ? "var(--accent)" : "var(--line)"}`, background: selectedAgentId === a.id ? "var(--chip)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                              >
                                <span style={{ fontSize: 12 }}>🤖</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-1)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                                  {a.role && <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0 }}>{a.role}</p>}
                                </div>
                                {selectedAgentId === a.id && <span style={{ fontSize: 10, color: "var(--accent)", flexShrink: 0 }}>✓</span>}
                              </button>
                            ))}
                            <button type="button" onClick={() => router.push(`/${locale}/ai-workers`)}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, border: "0.5px dashed var(--line)", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--accent)", fontSize: 11 }}
                            >
                              <span>+</span> Создать собственного AI-агента
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <ProjectImagesPanel projectId={projectId} />
          </div>

          {/* AI project recommendations */}
          {(projectRecs.length > 0 || loadingRecs) && (
            <div className="col-span-2 border border-line rounded-[10px] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-panel-2 border-b border-line">
                <span className="text-[13px]">✦</span>
                <span className="text-[11px] font-semibold text-tx-1">
                  AI рекомендации для {activeProject?.name}
                </span>
                {loadingRecs && (
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin ml-auto" />
                )}
              </div>
              {!loadingRecs && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:divide-x divide-y sm:divide-y-0 divide-line">
                  {projectRecs.map((rec, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: ["var(--accent)", "#8B5CF6", "#F59E0B"][
                              i
                            ],
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-[11px] text-tx-2 leading-relaxed">
                          {rec}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {loadingRecs && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:divide-x divide-y sm:divide-y-0 divide-line">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="h-3 bg-panel-2 rounded animate-pulse mb-1.5 w-full" />
                      <div className="h-3 bg-panel-2 rounded animate-pulse w-3/4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-line">
            <button
              onClick={() => {
                if (!name.trim()) {
                  setError("Введите название");
                  return;
                }
                setError("");
                const next = Math.min(step + 1, activeSteps.length - 1);
                setStep(next);
                setMaxStep((prev: number) => Math.max(prev, next));
              }}
              className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
            >
              Далее: {activeSteps[step + 1]?.label ?? "Запуск"} →
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 2: Platforms ══ */}
      {currentStepKey === "platforms" && (() => {
        const tgChannels = (connectedIntegrations as any[]).filter((i) => i.platform === "telegram");
        const igChannels = (connectedIntegrations as any[]).filter((i) => i.platform === "instagram");

        // Social network rows
        const SOCIAL_NETS = [
          { key: "telegram",  label: "Telegram",  sub: "Публикация в каналы",  color: "#0088CC", abbr: "TG", connectKey: "telegram" },
          { key: "instagram", label: "Instagram", sub: "Публикация постов и Stories", color: "#E1306C", abbr: "IG", connectKey: "instagram" },
          { key: "tiktok",    label: "TikTok",    sub: "Публикация видео",     color: "#010101", abbr: "TT", connectKey: "tiktok" },
          { key: "vk",        label: "ВКонтакте", sub: "Публикация в сообщества", color: "#0077FF", abbr: "VK", connectKey: "vk" },
        ];

        // Ad platform keys (from PLATFORM_META in data.ts — only ad networks)
        const AD_KEYS = ["yandex", "google", "meta", "vk", "mytarget", "tiktok", "kaspi"];

        const renderPlatformRow = (key: string, label: string, color: string, abbr: string, sub: string, connected: boolean, connectKey: string) => {
          const sel = selectedPlatforms.has(key);
          return (
            <div key={key} className={`border rounded-[9px] overflow-hidden transition-colors ${sel ? "border-accent/50" : "border-line"}`}>
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-hover" onClick={() => connected ? togglePlatform(key) : setConnectModal(connectKey)}>
                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center text-[9px] flex-shrink-0 ${sel && connected ? "bg-accent border-accent text-on-accent" : "border-line-strong"}`}>
                  {sel && connected && "✓"}
                </div>
                <PlatformLogo abbr={abbr} color={color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-medium text-tx-1">{label}</p>
                    {connected
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-pos">Подключён</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-accent">+ Подключить</span>}
                  </div>
                  <p className="text-[10px] text-tx-3">{sub}</p>
                </div>
              </div>
              {sel && connected && projectAgent && (
                <div className="px-3 pb-2 pt-1.5 border-t border-line bg-panel-2 flex items-center gap-2">
                  <span className="text-[10px] text-tx-3">🤖 Агент проекта:</span>
                  <span className="text-[10px] font-medium text-accent">{projectAgent.name}</span>
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="space-y-5">
            {/* ── Социальные сети ── */}
            <div>
              <p className="ui-label mb-2">Социальные сети</p>
              <div className="space-y-2">
                {SOCIAL_NETS.map(({ key, label, sub, color, abbr, connectKey }) => {
                  const isConnected =
                    key === "telegram" ? tgChannels.length > 0 :
                    key === "instagram" ? igChannels.length > 0 :
                    connectedKeys.has(key);

                  // Telegram: show each channel separately
                  if (key === "telegram" && tgChannels.length > 0) {
                    return (
                      <div key="telegram-group" className="space-y-1.5">
                        {tgChannels.map((ch: any) => {
                          const chKey = `telegram__${ch.channel_id}`;
                          const isSel = selectedPlatforms.has(chKey);
                          return (
                            <div key={ch.channel_id} className={`border rounded-[9px] overflow-hidden transition-colors ${isSel ? "border-accent/50" : "border-line"}`}>
                              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-hover" onClick={() => togglePlatform(chKey)}>
                                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center text-[9px] flex-shrink-0 ${isSel ? "bg-accent border-accent text-on-accent" : "border-line-strong"}`}>
                                  {isSel && "✓"}
                                </div>
                                <PlatformLogo abbr="TG" color="#0088CC" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[12px] font-medium text-tx-1">@{ch.channel_name}</p>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-pos">Telegram</span>
                                  </div>
                                  <p className="text-[10px] text-tx-3">Канал подключён</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={() => setConnectModal("telegram")} className="w-full text-[11px] text-accent hover:opacity-70 cursor-pointer py-1 text-center">
                          + Добавить ещё Telegram канал
                        </button>
                      </div>
                    );
                  }

                  return renderPlatformRow(key, label, color, abbr, sub, isConnected, connectKey);
                })}
              </div>
            </div>

            {/* ── Рекламные кабинеты ── */}
            <div>
              <p className="ui-label mb-2">Рекламные кабинеты</p>
              <div className="space-y-2">
                {AD_KEYS.map((key) => {
                  const meta = PLATFORM_META[key];
                  if (!meta) return null;
                  const isConnected = connectedKeys.has(key);
                  const rp = realPlatforms.find((p) => p.key === key);
                  const sub = rp?.accountInfo ?? (isConnected ? "Подключён" : "Запустить рекламу");
                  return renderPlatformRow(key, meta.name, meta.color, meta.abbr, sub, isConnected, key);
                })}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(step - 1)} className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer">
                ← Назад
              </button>
              <button
                onClick={() => {
                  if (selectedPlatforms.size === 0) { setError("Выберите платформу"); return; }
                  setError("");
                  const next = Math.min(step + 1, activeSteps.length - 1);
                  setStep(next);
                  setMaxStep((prev: number) => Math.max(prev, next));
                }}
                className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
              >
                Далее: {activeSteps[step + 1]?.label ?? "Запуск"} →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ══ STEP 1: Лендинг ══ */}
      {currentStepKey === "landing" && (() => {
        const selectedLp = (landingPages as any[]).find((lp: any) => lp.id === landingId) ?? null;
        const pages = landingPages as any[];

        const goToCreate = () => {
          const params = new URLSearchParams({
            from: "campaign",
            goal,
            ...(product && { product }),
            ...(audience && { audience }),
            ...(name && { campaign_name: name }),
            ...(draftId && { campaign_id: draftId }),
          });
          router.push(`/${locale}/landings/create?${params}`);
        };

        if (landingDetailId !== null) {
          return (
            <LandingDetail
              id={landingDetailId}
              onBack={() => setLandingDetailId(null)}
            />
          );
        }

        return (
          <div>
            {/* Empty state */}
            {pages.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", border: "1px dashed var(--line)", borderRadius: 14, background: "var(--panel)" }}>
                <span style={{ fontSize: 48, display: "block", marginBottom: 14 }}>🌐</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-1)", margin: "0 0 6px" }}>Нет лендингов</p>
                <p style={{ fontSize: 12, color: "var(--tx-3)", margin: "0 0 20px" }}>Создайте первый лендинг и свяжите его с кампанией</p>
                <button
                  onClick={goToCreate}
                  style={{ padding: "10px 24px", background: "var(--accent)", color: "var(--on-accent)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  + Создать лендинг
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Landing cards */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>
                    {selectedLp ? "Изменить лендинг" : "Выберите лендинг"}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, maxHeight: 460, overflowY: "auto" }}>
                    {pages.map((lp: any) => {
                      const isSelected = landingId === lp.id;
                      const cnt = (lp.content ?? {}) as any;
                      const blocks = cnt.blocks ?? [];
                      const brandColor = cnt.settings?.brandColor ?? "#6366f1";
                      const bgImage = cnt.bg_image ?? undefined;
                      return (
                        <button
                          key={lp.id}
                          onClick={() => {
                            setLandingId(lp.id);
                            setLandingDetailId(lp.id);
                          }}
                          style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, cursor: "pointer", border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--panel-2)", transition: "border-color 0.15s", textAlign: "left" }}
                        >
                          <div style={{ height: 90, overflow: "hidden", background: "var(--bg)", position: "relative", borderBottom: "1px solid var(--line)" }}>
                            {blocks.length > 0 ? (
                              <div style={{ width: 960, transform: "scale(0.229)", transformOrigin: "top left", pointerEvents: "none" }}>
                                <LandingRenderer blocks={blocks} brandColor={brandColor} bgImage={bgImage} preview={true} />
                              </div>
                            ) : (
                              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 28 }}>🌐</span>
                              </div>
                            )}
                            {isSelected && (
                              <div style={{ position: "absolute", top: 5, right: 5, background: "var(--accent)", color: "var(--on-accent)", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>✓</div>
                            )}
                          </div>
                          <div style={{ padding: "8px 10px" }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-1)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lp.title}</p>
                            <p style={{ fontSize: 10, color: "var(--tx-3)", margin: "2px 0 0" }}>{lp.published ? "✓ Опубликован" : "○ Черновик"}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={goToCreate}
                  style={{ padding: "8px", border: "1px dashed var(--line)", borderRadius: 9, fontSize: 12, color: "var(--tx-3)", cursor: "pointer", background: "none", textAlign: "center", fontFamily: "inherit" }}
                >
                  + Создать новый лендинг
                </button>
              </div>
            )}

            <div className="flex justify-between pt-3 mt-3 border-t border-line">
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
              >
                ← Назад
              </button>
              <button
                onClick={() => {
                  const next = Math.min(step + 1, activeSteps.length - 1);
                  setStep(next);
                  setMaxStep((prev: number) => Math.max(prev, next));
                }}
                className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
              >
                Далее: {activeSteps[step + 1]?.label ?? "Запуск"} →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ══ STEP 4: Контент ══ */}
      {currentStepKey === "content" && (() => {
        const socialKeys = ["instagram", "telegram", "tiktok", "youtube"];
        const adKeys = ["meta", "google", "yandex"];
        const sectionPlatforms = [...selectedPlatforms].filter(p =>
          activeContentSection === "social" ? socialKeys.includes(p) : adKeys.includes(p)
        );

        return (
          <div>
            {/* Секции: Соцсети / Рекламные кабинеты */}
            <div className="flex gap-2 mb-5">
              {[
                { key: "social" as const, label: "Соцсети", icon: "📱" },
                { key: "ads" as const, label: "Рекламные кабинеты", icon: "📊" },
              ].map(sec => (
                <button
                  key={sec.key}
                  onClick={() => setActiveContentSection(sec.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12px] font-medium border transition-colors cursor-pointer ${
                    activeContentSection === sec.key
                      ? "bg-accent text-on-accent border-accent"
                      : "border-line text-tx-2 hover:bg-hover"
                  }`}
                >
                  {sec.icon} {sec.label}
                </button>
              ))}
            </div>

            {/* Список платформ в секции */}
            {sectionPlatforms.length === 0 ? (
              <div className="border border-dashed border-line rounded-xl py-12 text-center text-tx-3 text-[12px] mb-5">
                {activeContentSection === "social"
                  ? "Нет подключённых соцсетей. Добавь их на шаге «Платформы»."
                  : "Нет подключённых рекламных кабинетов. Добавь их на шаге «Платформы»."}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap mb-5">
                {sectionPlatforms.map(p => {
                  const meta = (PLATFORM_META as any)[p];
                  return (
                    <div
                      key={p}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-line text-[12px] text-tx-1"
                      style={{ borderColor: meta?.color ?? "var(--line)" }}
                    >
                      <span style={{ color: meta?.color }}>{meta?.abbr ?? p}</span>
                      {meta?.name ?? p}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Кнопка создать план */}
            {!contentPlan && (
              <button
                onClick={generateContentPlan}
                disabled={contentPlanLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[9px] hover:opacity-90 cursor-pointer disabled:opacity-60 mb-4"
              >
                {contentPlanLoading ? (
                  <><span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" /> Анализирую тренды...</>
                ) : "✦ Создать план контента"}
              </button>
            )}

            {contentPlanError && (
              <p className="text-[12px] text-neg mb-4">{contentPlanError}</p>
            )}

            {/* Отображение плана */}
            {contentPlan && !contentPlanApproved && (
              <div className="border border-line rounded-[12px] p-4 bg-panel-2 mb-4">
                <p className="text-[13px] font-semibold text-tx-1 mb-3">✦ План контента от AI</p>

                {contentPlan.strategy && (
                  <p className="text-[12px] text-tx-2 mb-4 leading-relaxed">{contentPlan.strategy}</p>
                )}

                {contentPlan.socialMedia && Object.keys(contentPlan.socialMedia).length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-tx-3 uppercase tracking-wide mb-2">Соцсети</p>
                    {Object.entries(contentPlan.socialMedia).map(([platform, data]: [string, any]) => (
                      <div key={platform} className="mb-3 p-3 bg-panel rounded-[9px] border border-line">
                        <p className="text-[12px] font-semibold text-tx-1 mb-1.5 capitalize">{(PLATFORM_META as any)[platform]?.name ?? platform}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Object.entries(data)
                            .filter(([k]) => k !== "reasoning" && typeof data[k] === "number")
                            .map(([format, count]) => (
                              <span key={format} className="px-2 py-1 bg-accent/10 text-accent text-[11px] rounded-[6px]">
                                {format}: {count as number} шт.
                              </span>
                            ))}
                        </div>
                        {data.reasoning && (
                          <p className="text-[11px] text-tx-3 leading-relaxed">{data.reasoning}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {contentPlan.adPlatforms && Object.keys(contentPlan.adPlatforms).length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-tx-3 uppercase tracking-wide mb-2">Рекламные кабинеты</p>
                    {Object.entries(contentPlan.adPlatforms).map(([platform, data]: [string, any]) => (
                      <div key={platform} className="mb-3 p-3 bg-panel rounded-[9px] border border-line">
                        <p className="text-[12px] font-semibold text-tx-1 mb-1.5 capitalize">{(PLATFORM_META as any)[platform]?.name ?? platform}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Object.entries(data)
                            .filter(([k]) => k !== "reasoning" && typeof data[k] === "number")
                            .map(([format, count]) => (
                              <span key={format} className="px-2 py-1 bg-accent/10 text-accent text-[11px] rounded-[6px]">
                                {format}: {count as number} шт.
                              </span>
                            ))}
                        </div>
                        {data.reasoning && (
                          <p className="text-[11px] text-tx-3 leading-relaxed">{data.reasoning}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {contentPlan.postingSchedule && (
                  <p className="text-[11px] text-tx-2 border-t border-line pt-3 mt-1">📅 {contentPlan.postingSchedule}</p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setContentPlan(null); setContentPlanApproved(false); }}
                    className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Пересоздать план
                  </button>
                  <button
                    onClick={() => { setContentPlanApproved(true); generateFromPlan(); }}
                    className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[9px] hover:opacity-90 cursor-pointer"
                  >
                    ✓ Одобрить и создать контент
                  </button>
                </div>
              </div>
            )}

            {contentPlanApproved && (
              <div className="mb-4">
                {/* Спиннер пока генерируется */}
                {generating && generatedCreatives.length === 0 && (
                  <div className="border border-line rounded-[12px] p-8 bg-panel-2 text-center mb-4">
                    <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[13px] font-semibold text-tx-1">✦ AI генерирует контент</p>
                    <p className="text-[11px] text-tx-3 mt-1">Это займёт ~10-20 секунд</p>
                  </div>
                )}

                {/* Карточки контента */}
                {generatedCreatives.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <p className="text-[13px] font-semibold text-tx-1">
                        ✦ Готово: {generatedCreatives.length} единиц контента
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowBulkSchedule(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-accent text-accent text-[11px] font-medium rounded-[7px] hover:bg-accent/10 cursor-pointer"
                        >
                          🤖 AI распланирует сам
                        </button>
                        <button
                          onClick={() => { setContentPlanApproved(false); setGeneratedCreatives([]); }}
                          className="text-[11px] text-tx-3 hover:text-tx-1 cursor-pointer"
                        >
                          Пересоздать
                        </button>
                      </div>
                    </div>
                    {/* Фильтр по платформе */}
                    {(() => {
                      const platforms = [...new Set(generatedCreatives.map((c: any) => c.platform))];
                      if (platforms.length <= 1) return null;
                      return (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          <button
                            onClick={() => setCreativeFilter("all")}
                            className={`px-2.5 py-1 text-[11px] rounded-[7px] border cursor-pointer transition-colors ${creativeFilter === "all" ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
                          >
                            Все ({generatedCreatives.length})
                          </button>
                          {platforms.map(p => {
                            const meta = (PLATFORM_META as any)[p];
                            const count = generatedCreatives.filter((c: any) => c.platform === p).length;
                            return (
                              <button
                                key={p}
                                onClick={() => setCreativeFilter(p)}
                                className={`px-2.5 py-1 text-[11px] rounded-[7px] border cursor-pointer transition-colors ${creativeFilter === p ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
                              >
                                {meta?.name ?? p} ({count})
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 gap-3">
                      {generatedCreatives.filter((c: any) => creativeFilter === "all" || c.platform === creativeFilter).map((c: any) => {
                        const meta = (PLATFORM_META as any)[c.platform];
                        return (
                          <div key={c.id} className="border border-line rounded-[12px] p-4 bg-panel hover:border-line-strong transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] text-white"
                                  style={{ background: meta?.color ?? "var(--accent)" }}
                                >
                                  {meta?.abbr ?? c.platform}
                                </span>
                                <span className="text-[11px] text-tx-2 font-medium">{meta?.name ?? c.platform}</span>
                                <span className="text-[10px] text-tx-3 capitalize bg-panel-2 px-1.5 py-0.5 rounded-[4px]">{c.subtype}</span>
                              </div>
                            </div>
                            {c.platform === "google" && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-tx-3 uppercase tracking-wide mb-1">Заголовки</p>
                                {(c.headlines ?? []).map((h: string, i: number) => (
                                  <p key={i} className="text-[13px] font-semibold text-[#1a73e8]">{h}</p>
                                ))}
                                <p className="text-[10px] text-tx-3 uppercase tracking-wide mt-2 mb-1">Описания</p>
                                {(c.descriptions ?? []).map((d: string, i: number) => (
                                  <p key={i} className="text-[12px] text-tx-2">{d}</p>
                                ))}
                              </div>
                            )}
                            {c.platform === "yandex" && (
                              <div>
                                <p className="text-[13px] font-semibold text-[#fc3f1d]">{c.headline}</p>
                                <p className="text-[12px] text-tx-2 mt-1">{c.text}</p>
                              </div>
                            )}
                            {c.platform === "meta" && (
                              <div className="space-y-1">
                                <p className="text-[12px] text-tx-1 leading-relaxed">{c.primary_text}</p>
                                <p className="text-[13px] font-semibold text-tx-1">{c.headline}</p>
                                <p className="text-[11px] text-tx-3">{c.description}</p>
                              </div>
                            )}
                            {c.platform === "instagram" && (
                              <div>
                                {c.hook && <p className="text-[11px] font-medium text-accent mb-1">🎬 Hook: {c.hook}</p>}
                                {c.text && <p className="text-[13px] font-semibold text-tx-1 mb-1">{c.text}</p>}
                                {c.cta && <span className="inline-block mb-1 px-2 py-0.5 bg-accent/10 text-accent text-[11px] rounded-[5px]">CTA: {c.cta}</span>}
                                {c.caption && <p className="text-[12px] text-tx-1 leading-relaxed">{c.caption}</p>}
                                {c.script && <p className="text-[11px] text-tx-2 whitespace-pre-line mt-1">{c.script}</p>}
                                {c.hashtags && <p className="text-[11px] mt-1 text-[#0095f6]">{(c.hashtags as string[]).join(" ")}</p>}
                              </div>
                            )}
                            {c.platform === "telegram" && (
                              <div>
                                {c.hook && <p className="text-[11px] font-medium text-accent mb-1">🎬 Hook: {c.hook}</p>}
                                {c.caption && <p className="text-[12px] text-tx-1 leading-relaxed whitespace-pre-line">{c.caption}</p>}
                                {c.script && <p className="text-[11px] text-tx-2 whitespace-pre-line mt-1">{c.script}</p>}
                              </div>
                            )}
                            {c.platform === "tiktok" && (
                              <div>
                                {c.hook && <p className="text-[11px] font-medium text-accent mb-1">🎬 Hook: {c.hook}</p>}
                                {c.script && <p className="text-[11px] text-tx-2 whitespace-pre-line mb-1">{c.script}</p>}
                                {c.caption && <p className="text-[12px] text-tx-1">{c.caption}</p>}
                                {c.hashtags && <p className="text-[11px] mt-1 text-[#010101]">{(c.hashtags as string[]).join(" ")}</p>}
                              </div>
                            )}
                            {/* Кнопки публикации */}
                            <div className="flex gap-2 mt-3 pt-3 border-t border-line">
                              <button
                                onClick={() => setScheduleModal({
                                  creativeId: c.id,
                                  platform: c.platform,
                                  title: c.caption || c.headline || c.hook || c.subtype,
                                })}
                                className="flex-1 py-1.5 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
                              >
                                📅 Запланировать
                              </button>
                              <button
                                disabled={publishingNow === c.id}
                                onClick={async () => {
                                  setPublishingNow(c.id);
                                  try {
                                    await fetch("/api/scheduled-posts", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        content_id: c.id,
                                        platform: c.platform,
                                        scheduled_at: new Date().toISOString(),
                                        status: "pending",
                                      }),
                                    });
                                  } finally {
                                    setPublishingNow(null);
                                  }
                                }}
                                className="flex-1 py-1.5 bg-accent text-on-accent rounded-[7px] text-[11px] font-medium hover:opacity-90 cursor-pointer disabled:opacity-50"
                              >
                                {publishingNow === c.id ? "..." : "▶ Сейчас"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Кнопка запуска генерации (если не запустилась автоматически) */}
                {!generating && generatedCreatives.length === 0 && (
                  <button
                    onClick={generateFromPlan}
                    className="px-5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[9px] hover:opacity-90 cursor-pointer"
                  >
                    ✦ Генерировать контент
                  </button>
                )}
              </div>
            )}

            {/* Навигация */}
            <div className="flex justify-between pt-4 mt-4 border-t border-line">
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
              >
                ← Назад
              </button>
              <button
                onClick={() => {
                  const next = Math.min(step + 1, activeSteps.length - 1);
                  setStep(next);
                  setMaxStep((prev: number) => Math.max(prev, next));
                }}
                className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
              >
                Далее: {activeSteps[step + 1]?.label ?? "Запуск"} →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ══ STEP 5: Launch ══ */}
      {currentStepKey === "launch" && (
        <LaunchStep
          name={name}
          goal={goal}
          product={product}
          audience={audience}
          budget={budget}
          selectedPlatforms={selectedPlatforms}
          realPlatforms={realPlatforms}
          landingId={landingId}
          landingPages={landingPages as any[]}
          generatedCreatives={generatedCreatives}
          projectAgent={projectAgent}
          launchProgress={launchProgress}
          launching={launching}
          step={step}
          setStep={setStep}
          handleLaunch={handleLaunch}
        />
      )}

      {/* Connect platform modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setConnectModal(null)}
          />
          <div className="relative w-full max-w-[400px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Подключить {PLATFORM_META[connectModal]?.name}
              </h2>
              <button
                onClick={() => setConnectModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3"
              >
                ✕
              </button>
            </div>
            {connectModal === "instagram" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-tx-3 bg-panel-2 border border-line rounded-[8px] p-3 leading-relaxed">
                  Instagram подключается через официальный OAuth. Нужен Business
                  или Creator аккаунт.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectModal(null)}
                    className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      const appId =
                        process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";
                      const redirectUri =
                        process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ?? "";
                      const params = new URLSearchParams({
                        client_id: appId,
                        redirect_uri: redirectUri,
                        scope:
                          "instagram_business_basic,instagram_business_content_publish",
                        response_type: "code",
                      });
                      window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
                    }}
                    style={{ background: "#E1306C" }}
                    className="flex-1 py-2.5 text-white text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer border-none"
                  >
                    Подключить через Instagram
                  </button>
                </div>
              </div>
            ) : connectModal === "telegram" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-tx-3 bg-panel-2 border border-line rounded-[8px] p-3 leading-relaxed">
                  Добавь бота{" "}
                  <strong className="text-tx-1">
                    @{process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot"}
                  </strong>{" "}
                  как администратора канала, затем введи username
                </p>
                <div>
                  <label className="block ui-label mb-1">Username канала</label>
                  <input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="@mychannel"
                    className={inp}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectModal(null)}
                    className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={async () => {
                      if (!tokenInput.trim()) return;
                      setConnectingPlatform(true);
                      try {
                        const res = await fetch("/api/telegram/add-channel", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            channelUsername: tokenInput.replace("@", ""),
                          }),
                        });
                        if (res.ok) {
                          await refetchIntegrations();
                          setConnectModal(null);
                          setTokenInput("");
                        }
                      } finally {
                        setConnectingPlatform(false);
                      }
                    }}
                    disabled={connectingPlatform}
                    className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] cursor-pointer disabled:opacity-50"
                  >
                    {connectingPlatform ? "..." : "Добавить"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[12px] text-tx-2 bg-panel-2 border border-line rounded-[10px] p-3 leading-relaxed">
                  Подключите <strong className="text-tx-1">{PLATFORM_META[connectModal]?.name}</strong> на странице Интеграции, затем вернитесь сюда — платформа появится автоматически.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectModal(null)}
                    className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Отмена
                  </button>
                  <a
                    href={`/${locale}/integrations?from=campaigns`}
                    className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer text-center no-underline flex items-center justify-center"
                  >
                    Перейти в Интеграции →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setScheduleModal(null)}
          />
          <div className="relative w-full max-w-[380px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Запланировать
              </h2>
              <button
                onClick={() => setScheduleModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-tx-3 mb-4">
              {scheduleModal.title} · {scheduleModal.platform}
            </p>
            <div className="mb-4">
              <label className="block ui-label mb-1">Дата и время</label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className={inp}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleModal(null)}
                className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleScheduleCreative}
                disabled={!scheduleTime || scheduling}
                className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {scheduling ? "..." : "📅 Запланировать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkSchedule && (
        <BulkScheduleModal
          creatives={generatedCreatives}
          onClose={() => setShowBulkSchedule(false)}
          onScheduled={() => setShowBulkSchedule(false)}
        />
      )}
    </div>
  );
}
