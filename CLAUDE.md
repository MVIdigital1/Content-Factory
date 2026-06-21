# MVI Content Factory — Project Context

## Что это за проект

**MVI Content Factory** — AI-платформа для SMM-специалистов и агентств. Помогает создавать контент, управлять рекламными кампаниями, запускать AI-агентов и отслеживать аналитику по нескольким платформам (Telegram, Instagram, TikTok, VK, Яндекс Директ).

Целевая аудитория: маркетологи, SMM-агентства, малый и средний бизнес в России и Узбекистане.

---

## Стек технологий

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 (App Router) |
| Язык | TypeScript |
| БД и Auth | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) + OpenAI |
| Стили | Tailwind CSS + CSS-переменные (кастомная дизайн-система) |
| Стейт/Запросы | TanStack React Query v5 |
| Интернационализация | next-intl (ru / uz / en) |
| Графики | Recharts |
| Иконки | lucide-react |
| Деплой | Vercel |

---

## Структура папок

```
app/
  [locale]/
    (dashboard)/          ← все страницы дашборда (требуют авторизации)
      layout.tsx          ← Sidebar + TopNavbar обёртка
      projects/           ← управление проектами (основная сущность)
      campaigns/          ← рекламные кампании
      create/             ← создание контента (основная AI-фича)
      ai-workers/         ← AI-агенты
      dashboard/          ← главная страница с метриками
      history/            ← история контента
      analytics/          ← аналитика
      calendar/           ← контент-календарь
      summary/            ← сводка
      tasks/              ← задачи
      ab-tests/           ← A/B тесты
      integrations/       ← подключение каналов
      crm/                ← CRM клиентов
      team/               ← команда
      chat/               ← чат
      tickets/            ← поддержка
      billing/            ← тарифы и оплата
      referral/           ← реферальная программа
      settings/           ← настройки
      tokens/             ← токены (лимиты AI)
      infographics/       ← генерация инфографики
    auth/                 ← login / register / callback
    admin/                ← admin-панель
    page.tsx              ← лендинг (публичный)
  api/                    ← Route Handlers
    ai/                   ← AI-эндпоинты (generate, score-post, smm-manager и др.)
    telegram/             ← Telegram API интеграция
    billing/              ← Click / Payme вебхуки
    content/              ← публикация контента
    tokens/               ← баланс и списание токенов
components/
  features/               ← основные компоненты (Sidebar, TopNavbar и др.)
  ads/                    ← компоненты рекламного модуля (WizardView и др.)
  ui/                     ← базовые UI-компоненты (Button, Modal, Badge и др.)
lib/
  ai/claude.ts            ← клиент Anthropic + системный промпт
  supabase/               ← client.ts / server.ts / types.ts
  hooks/                  ← кастомные хуки (useAdsData и др.)
messages/                 ← переводы ru.json / uz.json / en.json
supabase/migrations/      ← SQL-миграции
```

---

## Основные сущности в БД (Supabase)

| Таблица | Описание |
|---------|----------|
| `projects` | Проекты брендов. Поля: `name`, `niche`, `description`, `audience`, `tone`, `language`, `logo_url`, `is_active`, `ai_agent_id` |
| `contents` | Сгенерированный контент. Привязан к `project_id` |
| `ad_campaigns` | Рекламные кампании. Привязаны к `project_id` |
| `ai_agents` | AI-агенты. Привязаны к `project_id` через `ai_agent_id` |
| `tasks` | Задачи |
| `profiles` | Профили пользователей |

Все таблицы привязаны к `user_id` (Supabase Auth UUID). Row Level Security включён.

---

## Дизайн-система (CSS-переменные)

Все цвета — через переменные, не через Tailwind-палитру:

```
--bg           фон страницы
--panel        фон панелей/карточек
--panel-2      вторичный фон
--line         бордер обычный
--line-strong  бордер активный
--tx-1         текст основной
--tx-2         текст вторичный
--tx-3         текст третичный (подписи, плейсхолдеры)
--accent       акцентный цвет (кнопки, активные элементы)
--on-accent    текст поверх accent
--neg          цвет ошибок/удаления (красный)
--hover        фон при hover
--chip         фон тегов/чипсов
```

CSS-классы из глобального стиля:
- `ui-surface` — карточка/поверхность
- `ui-label` — лейбл поля формы
- `text-tx-1`, `text-tx-2`, `text-tx-3` — текстовые цвета

Тема переключается через `ThemeProvider` (light/dark), сохраняется в localStorage.

---

## Паттерны кода

### Supabase клиент
```ts
// В клиентских компонентах ("use client")
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// В серверных компонентах / Route Handlers
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

### Запросы данных
Всегда через **TanStack React Query** в клиентских компонентах:
```ts
const { data, isLoading } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => { /* supabase query */ }
});

const mutation = useMutation({
  mutationFn: async (id: string) => { /* supabase update */ },
  onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] })
});
```

### AI вызовы
Все AI-запросы — через серверные Route Handlers (`app/api/ai/*/route.ts`), не напрямую с клиента. Используется `@anthropic-ai/sdk` (Claude) и `openai` SDK.

### Интернационализация
```ts
import { useTranslations, useLocale } from "next-intl";
const t = useTranslations("Namespace");
const locale = useLocale(); // "ru" | "uz" | "en"
```
Переводы в `messages/ru.json`, `messages/uz.json`, `messages/en.json`.

### Навигация
```ts
import { useRouter } from "next/navigation";
import Link from "next/link";
// Все ссылки с локалью:
href={`/${locale}/projects/${id}`}
```

### Стили
Смешанный подход: Tailwind-классы + инлайн `style={}`. Не используй внешние CSS-файлы — только `globals.css` для переменных и базовых классов.

---

## Ключевые страницы и их особенности

### `/projects` — Проекты
- Браузерные вкладки внутри страницы (создание нескольких проектов одновременно)
- Черновики: сохраняются в `localStorage` (ключ `project_drafts_v1`)
- Редактирование: открывается модальным окном с полной формой
- Форма создания: 2 колонки — левая (логотип, название, ниша с деревом, тон с подстилями, язык), правая (описание, аудитория)
- Ниша и тон — двухуровневые: сначала категория, потом подкатегория

### `/campaigns` — Кампании
- Таб-структура: Кампании / Создать (WizardView) / Креативы / Отчёты / Подключить
- WizardView — многошаговый визард для создания рекламной кампании
- `components/ads/` — все компоненты этого модуля

### `/create` — Создание контента
- Основная AI-фича: генерация постов для соцсетей
- Использует данные проекта (бренд, аудитория, тон) для промпта

### `/ai-workers` — AI-агенты
- Настройка и запуск AI-агентов (SMM-менеджер, аналитик, копирайтер и др.)

### `/billing` — Оплата
- Интеграция с Click и Payme (платёжные системы СНГ)
- Вебхуки: `app/api/billing/click/webhook/route.ts`, `app/api/billing/payme/webhook/route.ts`

### `/tokens` — Токены
- Система лимитов AI-использования
- Баланс токенов, процент использования, история трат

---

## Мультиязычность (i18n)

- Локаль в URL: `/{locale}/dashboard` → `/ru/dashboard`, `/uz/dashboard`, `/en/dashboard`
- Роутинг настроен в `i18n/routing.ts`, middleware в `middleware.ts`
- По умолчанию: `ru`

---

## Переменные окружения (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## Команды

```bash
npm run dev      # запуск dev-сервера (localhost:3000)
npm run build    # production сборка
npm run lint     # линтер
```

---

## Что важно знать при работе с кодом

1. **Все компоненты в `(dashboard)` — клиентские** (`"use client"`), данные через React Query
2. **Не трогай `components/LangSwitcher.tsx`, `components/QueryProvider.tsx` и подобные дубли** в корне `components/` — используй версии из `components/features/`
3. **Стили** — не добавляй новых CSS файлов; используй Tailwind-классы и CSS-переменные через `style={{}}`
4. **Мутации** после успеха всегда инвалидируй нужные queryKey через `qc.invalidateQueries()`
5. **Логотипы** хранятся в Supabase Storage bucket `content-images`, папка `logos/{user_id}/`
6. **Admin-раздел** (`/admin`) защищён отдельной проверкой роли
7. **Суфикс `_v2`, `_v1`** в localStorage-ключах — намеренно, для совместимости при изменении схемы

---

## Текущий статус разработки

- ✅ Аутентификация (Supabase Auth)
- ✅ Управление проектами (с редактированием, черновиками)
- ✅ Создание контента через AI
- ✅ Рекламные кампании (WizardView с шагами)
- ✅ AI-агенты
- ✅ Аналитика, календарь, история контента
- ✅ Биллинг (Click / Payme)
- ✅ Токены (лимиты AI)
- ✅ Инфографика
- ✅ Мультиязычность (ru/uz/en)
- 🔄 CRM, командная работа, тикеты — базовая структура есть
- 🔄 Интеграция с Instagram API (частичная)
- 🔄 Telegram публикация — есть, продолжается доработка
