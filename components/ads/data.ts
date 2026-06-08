// Static mock data — will be replaced with Supabase queries

export const PLATFORM_META: Record<string, { color: string; textColor?: string; abbr: string; name: string; region: 'cis' | 'global' }> = {
  yandex:   { color: '#FFDB4D', textColor: '#664400', abbr: 'Я',  name: 'Яндекс Директ',  region: 'cis' },
  vk:       { color: '#0077FF', abbr: 'VK', name: 'VK Реклама',     region: 'cis' },
  telegram: { color: '#0088CC', abbr: 'TG', name: 'Telegram Ads',   region: 'cis' },
  mytarget: { color: '#FF6600', abbr: 'MT', name: 'myTarget',       region: 'cis' },
  kaspi:    { color: '#E31E24', abbr: 'K',  name: 'Kaspi Ads',      region: 'cis' },
  google:   { color: '#34A853', abbr: 'G',  name: 'Google Ads',     region: 'global' },
  meta:     { color: '#1877F2', abbr: 'M',  name: 'Meta Ads',       region: 'global' },
  tiktok:   { color: '#000000', abbr: 'TT', name: 'TikTok Ads',     region: 'global' },
}

export const MOCK_COMPANIES = [
  { id: '1', name: 'Пятый элемент', initial: 'П', color: '#4ABA74' },
  { id: '2', name: 'Optima Style',  initial: 'O', color: '#3B82F6' },
  { id: '3', name: 'iPhone Store',  initial: 'i', color: '#8B5CF6' },
]

export const MOCK_KPIS = [
  { value: '₽284k', label: 'Расход / мес',   delta: '↑ 18%',          positive: true  },
  { value: '2.8%',  label: 'CTR',             delta: '↑ 0.3%',         positive: true  },
  { value: '₽142',  label: 'CPL',             delta: '↓ 18% — отлично',positive: true  },
  { value: '340%',  label: 'ROAS',            delta: '↑ 60%',          positive: true  },
  { value: '84',    label: 'Заявок / мес',    delta: '+12 к прошлому', positive: true  },
]

export const MOCK_CAMPAIGNS = [
  {
    id: '1', name: 'Ramadan акция — салфетки оптом',
    description: 'Поиск + РСЯ · Ташкент · 25-55 лет · Look-alike',
    platforms: ['yandex', 'google'], status: 'active' as const,
    spend: '₽94 200', ctr: 3.1, cpl: '₽118', roas: 380, badge: 'Активна',
  },
  {
    id: '2', name: 'Бытовая химия — ретаргет',
    description: 'FB + Instagram + VK · посетители сайта 30 дней · карусели',
    platforms: ['meta', 'vk'], status: 'active' as const,
    spend: '$890', ctr: 2.2, cpl: '₽165', roas: 290, badge: 'Активна',
  },
  {
    id: '3', name: 'Тестовый креатив #3 — губки',
    description: 'VK Реклама · A/B тест 3 баннеров · AI выбирает победителя',
    platforms: ['vk'], status: 'ab_test' as const,
    spend: '₽31 500', ctr: 1.8, cpl: '₽210', roas: 210, badge: 'A/B тест',
  },
  {
    id: '4', name: 'Брендовый трафик — поиск',
    description: 'Запросы «пятый элемент туалетная бумага» · Узбекистан',
    platforms: ['yandex'], status: 'paused' as const,
    spend: '₽12 400', ctr: 4.8, cpl: '₽42', roas: 580, badge: 'Пауза',
  },
]

export const MOCK_AUDIENCES = [
  { icon: '👥', label: 'Текущие клиенты', size: '12k' },
  { icon: '🎯', label: 'Look-alike',       size: '340k' },
  { icon: '🔄', label: 'Ретаргетинг',     size: '8.2k' },
  { icon: '📍', label: 'Ташкент 25-45',   size: '180k' },
]

export const MOCK_AI_RECS = [
  {
    id: '1', type: 'urgent' as const,
    title: 'Останови «Тестовый креатив #3»',
    description: 'CTR 1.2% за 48 часов. AI зафиксировал 92% статистическую значимость — креатив проиграл.',
    action: 'Остановить',
  },
  {
    id: '2', type: 'opportunity' as const,
    title: 'Увеличь бюджет «Ramadan акция» на 40%',
    description: 'ROAS 380% и растёт. При ₽130k/мес AI прогнозирует ROAS 350% и +35 заявок.',
    action: 'Применить',
  },
  {
    id: '3', type: 'idea' as const,
    title: 'Запусти ретаргет по визитам блога',
    description: '2 340 посетителей блога за месяц ещё не покупали. CPL ≈ ₽85.',
    action: 'Создать кампанию',
  },
  {
    id: '4', type: 'antifraud' as const,
    title: 'Заблокировал 47 ботов',
    description: 'Подозрительные клики. Возвращено ₽3 240 в бюджет.',
  },
]

export const MOCK_AUTO_RULES = [
  { id: '1', name: 'Пауза при CTR < 1%',           condition_field: 'ctr',  condition_op: 'lt',  condition_value: 1,   action_type: 'pause',           is_active: true },
  { id: '2', name: 'Stop-loss при CPL > ₽250',      condition_field: 'cpl',  condition_op: 'gt',  condition_value: 250, action_type: 'stop',            is_active: true },
  { id: '3', name: '+20% бюджета при ROAS > 400%',  condition_field: 'roas', condition_op: 'gt',  condition_value: 400, action_type: 'increase_budget', is_active: true },
]

export const MOCK_REPORTS = [
  { id: '1', title: 'Еженедельный отчёт · 19-26 мая', subtitle: 'Пятый элемент · все платформы · PDF', status: 'sent' as const,      icon: '📄' },
  { id: '2', title: 'Месячный отчёт · апрель 2026',   subtitle: 'Все проекты · ROI 340% · AI комментарий', status: 'live' as const, icon: '📊' },
  { id: '3', title: 'Авто-отправка каждый пн 09:00',  subtitle: 'Email + Telegram · 3 клиента', status: 'scheduled' as const,        icon: '⏰' },
]
