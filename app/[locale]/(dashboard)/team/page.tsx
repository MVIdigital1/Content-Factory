"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Users,
  X,
  Search,
  Lock,
  Pencil,
  Trash2,
  MoreHorizontal,
  Check,
  Download,
  RotateCcw,
  Eye,
  ChevronRight,
  Shield,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Permission = {
  key: string;
  label: string;
  category: string;
  desc: string;
};

type SystemRole = {
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  isSystem: true;
  permissions: string[];
};

type CustomRole = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  isSystem: false;
  permissions: string[];
  member_count?: number;
};

type AnyRole = SystemRole | CustomRole;

type Member = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  status: string;
  created_at: string;
  user_id: string | null;
  project_ids: string[] | null;
  last_active_at: string | null;
  blocked_at: string | null;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string | null;
  status: string;
  token: string | null;
};

type AuditEntry = {
  id: string;
  actor_email: string | null;
  action: string;
  target_email: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PERMISSION_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "workspace", label: "Воркспейс", icon: "🏢" },
  { key: "team", label: "Команда", icon: "👥" },
  { key: "projects", label: "Проекты", icon: "📁" },
  { key: "content", label: "Контент", icon: "✍️" },
  { key: "campaigns", label: "Кампании", icon: "📣" },
  { key: "analytics", label: "Аналитика", icon: "📊" },
  { key: "ai", label: "AI", icon: "✦" },
  { key: "integrations", label: "Интеграции", icon: "🔗" },
  { key: "approval", label: "Согласование", icon: "✅" },
  { key: "schedule", label: "Расписание", icon: "📅" },
  { key: "media", label: "Медиа", icon: "🗂️" },
  { key: "notifications", label: "Уведомления", icon: "🔔" },
];

const ALL_PERMISSIONS: Permission[] = [
  { key: "workspace.settings", label: "Настройки воркспейса", category: "workspace", desc: "Изменять название, логотип и настройки" },
  { key: "workspace.billing", label: "Биллинг", category: "workspace", desc: "Управлять тарифами и оплатой" },
  { key: "workspace.tokens", label: "Токены", category: "workspace", desc: "Управлять балансом AI-токенов" },
  { key: "workspace.transfer_ownership", label: "Передача владения", category: "workspace", desc: "Передать воркспейс другому пользователю" },
  { key: "team.view", label: "Просмотр команды", category: "team", desc: "Видеть список участников" },
  { key: "team.invite", label: "Приглашать", category: "team", desc: "Отправлять приглашения" },
  { key: "team.manage_roles", label: "Управление ролями", category: "team", desc: "Назначать и менять роли" },
  { key: "team.remove", label: "Удалять участников", category: "team", desc: "Исключать из команды" },
  { key: "team.view_audit", label: "Журнал действий", category: "team", desc: "Просматривать историю изменений" },
  { key: "projects.view", label: "Просмотр проектов", category: "projects", desc: "Видеть список проектов" },
  { key: "projects.create", label: "Создание проектов", category: "projects", desc: "Создавать новые проекты" },
  { key: "projects.edit", label: "Редактирование", category: "projects", desc: "Изменять настройки проектов" },
  { key: "projects.delete", label: "Удаление", category: "projects", desc: "Удалять проекты" },
  { key: "projects.archive", label: "Архивирование", category: "projects", desc: "Архивировать проекты" },
  { key: "content.view", label: "Просмотр контента", category: "content", desc: "Видеть весь контент" },
  { key: "content.create", label: "Создание контента", category: "content", desc: "Создавать новый контент" },
  { key: "content.edit_own", label: "Редактировать своё", category: "content", desc: "Редактировать только свои материалы" },
  { key: "content.edit_all", label: "Редактировать всё", category: "content", desc: "Редактировать любой контент" },
  { key: "content.publish", label: "Публикация", category: "content", desc: "Публиковать контент" },
  { key: "content.delete", label: "Удаление контента", category: "content", desc: "Удалять материалы" },
  { key: "campaigns.view", label: "Просмотр кампаний", category: "campaigns", desc: "Видеть рекламные кампании" },
  { key: "campaigns.create", label: "Создание кампаний", category: "campaigns", desc: "Создавать кампании" },
  { key: "campaigns.manage", label: "Управление", category: "campaigns", desc: "Управлять кампаниями" },
  { key: "campaigns.budget", label: "Бюджет", category: "campaigns", desc: "Управлять бюджетом кампаний" },
  { key: "campaigns.delete", label: "Удаление кампаний", category: "campaigns", desc: "Удалять кампании" },
  { key: "analytics.view", label: "Базовая аналитика", category: "analytics", desc: "Просматривать основные метрики" },
  { key: "analytics.deep", label: "Углублённая аналитика", category: "analytics", desc: "Доступ к детальным отчётам" },
  { key: "analytics.financial", label: "Финансовая аналитика", category: "analytics", desc: "Финансовые показатели" },
  { key: "analytics.export", label: "Экспорт", category: "analytics", desc: "Экспортировать данные" },
  { key: "ai.use", label: "Использование AI", category: "ai", desc: "Генерировать контент через AI" },
  { key: "ai.generate_image", label: "Генерация изображений", category: "ai", desc: "Создавать изображения через AI" },
  { key: "ai.manage_agents", label: "AI-агенты", category: "ai", desc: "Управлять AI-агентами" },
  { key: "ai.token_budget", label: "Бюджет токенов", category: "ai", desc: "Управлять бюджетом токенов" },
  { key: "integrations.view", label: "Просмотр интеграций", category: "integrations", desc: "Видеть подключённые сервисы" },
  { key: "integrations.connect", label: "Подключение", category: "integrations", desc: "Подключать новые интеграции" },
  { key: "integrations.disconnect", label: "Отключение", category: "integrations", desc: "Отключать интеграции" },
  { key: "approval.request", label: "Запрос на согласование", category: "approval", desc: "Отправлять на согласование" },
  { key: "approval.review", label: "Просмотр запросов", category: "approval", desc: "Просматривать заявки" },
  { key: "approval.approve", label: "Согласование", category: "approval", desc: "Согласовывать контент" },
  { key: "approval.reject", label: "Отклонение", category: "approval", desc: "Отклонять контент" },
  { key: "schedule.view", label: "Просмотр расписания", category: "schedule", desc: "Видеть запланированный контент" },
  { key: "schedule.create", label: "Создание записей", category: "schedule", desc: "Планировать публикации" },
  { key: "schedule.edit", label: "Редактирование", category: "schedule", desc: "Изменять расписание" },
  { key: "schedule.delete", label: "Удаление записей", category: "schedule", desc: "Удалять запланированное" },
  { key: "media.view", label: "Просмотр медиа", category: "media", desc: "Видеть медиатеку" },
  { key: "media.upload", label: "Загрузка файлов", category: "media", desc: "Загружать медиафайлы" },
  { key: "media.delete", label: "Удаление файлов", category: "media", desc: "Удалять медиафайлы" },
  { key: "notifications.view", label: "Уведомления", category: "notifications", desc: "Получать уведомления" },
  { key: "notifications.manage_team", label: "Управление уведомлениями команды", category: "notifications", desc: "Настраивать уведомления для команды" },
];

const ALL_PERM_KEYS = ALL_PERMISSIONS.map((p) => p.key);
const ALL_EXCEPT_TRANSFER = ALL_PERM_KEYS.filter((k) => k !== "workspace.transfer_ownership");

const SYSTEM_ROLES: SystemRole[] = [
  {
    key: "owner",
    label: "Владелец",
    description: "Полный доступ включая биллинг и передачу владения",
    color: "#FF5A36",
    icon: "👑",
    isSystem: true,
    permissions: ALL_PERM_KEYS,
  },
  {
    key: "admin",
    label: "Администратор",
    description: "Все права кроме передачи владения",
    color: "#B5740F",
    icon: "🛡️",
    isSystem: true,
    permissions: ALL_EXCEPT_TRANSFER,
  },
  {
    key: "manager",
    label: "Менеджер",
    description: "Управление командой, контентом и кампаниями",
    color: "#1B5FA8",
    icon: "💼",
    isSystem: true,
    permissions: [
      "team.view", "team.invite",
      "projects.view", "projects.create", "projects.edit", "projects.archive",
      "content.view", "content.create", "content.edit_own", "content.edit_all", "content.publish", "content.delete",
      "campaigns.view", "campaigns.create", "campaigns.manage",
      "analytics.view", "analytics.deep",
      "ai.use", "ai.generate_image",
      "integrations.view",
      "approval.request", "approval.review", "approval.approve", "approval.reject",
      "schedule.view", "schedule.create", "schedule.edit", "schedule.delete",
      "media.view", "media.upload",
      "notifications.view",
    ],
  },
  {
    key: "content_maker",
    label: "Контент-мейкер",
    description: "Создание и публикация контента",
    color: "#0E6E56",
    icon: "✍️",
    isSystem: true,
    permissions: [
      "team.view",
      "projects.view",
      "content.view", "content.create", "content.edit_own",
      "analytics.view",
      "ai.use", "ai.generate_image",
      "approval.request",
      "schedule.view", "schedule.create", "schedule.edit",
      "media.view", "media.upload",
      "notifications.view",
    ],
  },
  {
    key: "analyst",
    label: "Аналитик",
    description: "Доступ к аналитике и отчётам",
    color: "#5A4FBE",
    icon: "📊",
    isSystem: true,
    permissions: [
      "team.view",
      "projects.view",
      "content.view",
      "campaigns.view",
      "analytics.view", "analytics.deep", "analytics.export",
      "integrations.view",
      "schedule.view",
      "media.view",
      "notifications.view",
    ],
  },
  {
    key: "client",
    label: "Клиент",
    description: "Просмотр и согласование материалов",
    color: "#6E6557",
    icon: "👤",
    isSystem: true,
    permissions: [
      "projects.view",
      "content.view",
      "campaigns.view",
      "analytics.view",
      "approval.review", "approval.approve", "approval.reject",
      "media.view",
      "notifications.view",
    ],
  },
];

const ROLE_COLORS_PRESET = [
  "#FF5A36", "#B5740F", "#1B5FA8", "#0E6E56",
  "#5A4FBE", "#6E6557", "#C2185B", "#00796B",
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function getRoleInfo(roleKey: string, customRoles: CustomRole[]): { label: string; color: string; icon: string } {
  const sys = SYSTEM_ROLES.find((r) => r.key === roleKey);
  if (sys) return { label: sys.label, color: sys.color, icon: sys.icon };
  const cust = customRoles.find((r) => r.id === roleKey || r.name === roleKey);
  if (cust) return { label: cust.name, color: cust.color, icon: cust.icon };
  return { label: roleKey, color: "#888888", icon: "🔑" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDatetime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function validateEmails(raw: string): string[] {
  return raw.split(/[\n,;]+/).map((s) => s.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function getAuditDescription(entry: AuditEntry): string {
  const m = entry.metadata || {};
  switch (entry.action) {
    case "invite_sent": return `пригласил ${entry.target_email} с ролью ${m.role || "—"}`;
    case "role_changed": return `изменил роль ${entry.target_email}: ${m.old_role || "—"} → ${m.new_role || "—"}`;
    case "member_removed": return `удалил участника ${entry.target_email}`;
    case "member_blocked": return `заблокировал ${entry.target_email}`;
    case "role_created": return `создал кастомную роль «${m.role_name || "—"}»`;
    case "role_deleted": return `удалил кастомную роль «${m.role_name || "—"}»`;
    case "invite_revoked": return `отозвал приглашение для ${entry.target_email}`;
    default: return entry.action;
  }
}

function getAuditDotColor(action: string): string {
  switch (action) {
    case "invite_sent": return "#1B5FA8";
    case "role_changed": return "#B5740F";
    case "member_removed": return "var(--neg)";
    case "member_blocked": return "var(--neg)";
    case "role_created": return "#0E6E56";
    case "role_deleted": return "var(--neg)";
    case "invite_revoked": return "#5A4FBE";
    default: return "var(--tx-3)";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-3 py-2.5 rounded-[10px] border border-line text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3";

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(14,110,86,0.12)", color: "#0E6E56" }}>Активен</span>;
  if (status === "pending")
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(181,116,15,0.12)", color: "#B5740F" }}>Приглашён</span>;
  if (status === "blocked")
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "var(--neg)" }}>Заблокирован</span>;
  return <span className="text-[11px] text-tx-3">{status}</span>;
}

function RoleBadge({ roleKey, customRoles }: { roleKey: string; customRoles: CustomRole[] }) {
  const info = getRoleInfo(roleKey, customRoles);
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
      style={{ background: info.color + "1A", color: info.color }}
    >
      <span>{info.icon}</span>
      {info.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function InviteModal({
  onClose,
  customRoles,
  projects,
}: {
  onClose: () => void;
  customRoles: CustomRole[];
  projects: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("content_maker");
  const [allProjects, setAllProjects] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [error, setError] = useState("");

  const allRoles: AnyRole[] = [...SYSTEM_ROLES, ...customRoles];
  const validEmails = validateEmails(emailsRaw);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      let workspace: { id: string } | null = null;
      const { data: ws, error: wsErr } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      if (!ws) {
        const { data: newWs, error: createErr } = await supabase.from("workspaces").insert({ name: "Мой воркспейс", owner_id: user.id }).select().single();
        if (!newWs) throw new Error(createErr?.message ?? "Не удалось создать воркспейс");
        workspace = newWs;
      } else {
        workspace = ws;
      }

      if (!workspace) throw new Error("Не удалось получить воркспейс");

      for (const email of validEmails) {
        await supabase.from("workspace_members").insert({
          workspace_id: workspace.id,
          email,
          role: selectedRole,
          invited_by: user.id,
          status: "pending",
          project_ids: allProjects ? null : selectedProjects,
        });

        await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: selectedRole }),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const STEP_LABELS = ["Адреса", "Роль", "Проекты", "Подтверждение"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-line shadow-2xl" style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h2 className="text-[16px] font-semibold text-tx-1">Пригласить участников</h2>
            <p className="text-[12px] text-tx-3 mt-0.5">Шаг {step} из 4 — {STEP_LABELS[step - 1]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover cursor-pointer text-tx-3 hover:text-tx-1 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ background: i < step ? "var(--accent)" : "var(--line)" }} />
          ))}
        </div>

        <div className="px-6 py-5 min-h-[260px]">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-tx-2 mb-1.5 block">
                  Email-адреса <span className="text-tx-3">(через запятую или с новой строки)</span>
                </label>
                <textarea
                  value={emailsRaw}
                  onChange={(e) => { setEmailsRaw(e.target.value); setError(""); }}
                  rows={4}
                  placeholder={"ivan@company.com\nanna@company.com, petr@example.ru"}
                  className={INPUT_CLS + " resize-none"}
                  style={{ fontFamily: "inherit" }}
                />
                {validEmails.length > 0 && (
                  <p className="text-[12px] text-tx-3 mt-1">Найдено: <span className="text-accent font-medium">{validEmails.length}</span> адрес(-ов)</p>
                )}
              </div>
              <div>
                <label className="text-[12px] font-medium text-tx-2 mb-1.5 block">
                  Сообщение <span className="text-tx-3">(необязательно)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Привет! Приглашаю тебя в нашу команду..."
                  className={INPUT_CLS + " resize-none"}
                  style={{ fontFamily: "inherit" }}
                />
              </div>
              {error && <p className="text-[12px] text-neg">{error}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <p className="text-[12px] text-tx-3 mb-3">Выберите роль для приглашённых участников</p>
              {allRoles.map((r) => {
                const key = r.isSystem ? r.key : (r as CustomRole).id;
                const label = r.isSystem ? r.label : (r as CustomRole).name;
                const selected = selectedRole === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedRole(key)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer"
                    style={{ borderColor: selected ? r.color : "var(--line)", background: selected ? r.color + "0D" : "var(--panel-2)" }}
                  >
                    <span className="text-[18px]">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-tx-1">{label}</p>
                      <p className="text-[11px] text-tx-3 truncate">{r.description}</p>
                    </div>
                    {selected && <Check size={14} style={{ color: r.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-[12px] text-tx-3 mb-3">Укажите проекты, к которым будет доступ</p>
              {([true, false] as const).map((opt) => (
                <button
                  key={String(opt)}
                  onClick={() => setAllProjects(opt)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors"
                  style={{ borderColor: allProjects === opt ? "var(--accent)" : "var(--line)", background: allProjects === opt ? "rgba(255,90,54,0.05)" : "var(--panel-2)" }}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: allProjects === opt ? "var(--accent)" : "var(--line)" }}>
                    {allProjects === opt && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--accent)" }} />}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-tx-1">{opt ? "Все проекты" : "Конкретные проекты"}</p>
                    <p className="text-[11px] text-tx-3">{opt ? "Доступ ко всем текущим и будущим проектам" : "Выберите проекты из списка"}</p>
                  </div>
                </button>
              ))}
              {!allProjects && (
                <div className="space-y-1 mt-2 pl-2">
                  {projects.length === 0 ? (
                    <p className="text-[12px] text-tx-3 py-2">Проекты не найдены</p>
                  ) : projects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-hover cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(p.id)}
                        onChange={(e) => setSelectedProjects(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                        className="accent-accent"
                      />
                      <span className="text-[13px] text-tx-1">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-[12px] text-tx-3 mb-3">Проверьте данные перед отправкой</p>
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <div className="flex items-start gap-3">
                  <span className="text-[12px] text-tx-3 w-24 flex-shrink-0">Адреса</span>
                  <div className="flex flex-wrap gap-1">
                    {validEmails.map((e) => (
                      <span key={e} className="text-[11px] px-2 py-0.5 rounded-full bg-chip text-tx-2">{e}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-tx-3 w-24 flex-shrink-0">Роль</span>
                  {(() => {
                    const r = allRoles.find(r => r.isSystem ? r.key === selectedRole : (r as CustomRole).id === selectedRole);
                    if (!r) return null;
                    return (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: r.color + "1A", color: r.color }}>
                        {r.icon} {r.isSystem ? r.label : (r as CustomRole).name}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-tx-3 w-24 flex-shrink-0">Проекты</span>
                  <span className="text-[12px] text-tx-1">
                    {allProjects ? "Все проекты" : selectedProjects.length === 0 ? "Не выбраны" : `${selectedProjects.length} проект(-ов)`}
                  </span>
                </div>
                {message && (
                  <div className="flex items-start gap-3">
                    <span className="text-[12px] text-tx-3 w-24 flex-shrink-0">Сообщение</span>
                    <span className="text-[12px] text-tx-2">{message}</span>
                  </div>
                )}
              </div>
              {error && <p className="text-[12px] text-neg">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 pb-5 pt-1">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2.5 border border-line rounded-[10px] text-[13px] text-tx-2 hover:bg-hover cursor-pointer transition-colors"
            style={{ fontFamily: "inherit" }}
          >
            {step === 1 ? "Отмена" : "Назад"}
          </button>
          <button
            onClick={() => {
              if (step < 4) {
                if (step === 1 && validEmails.length === 0) { setError("Введите хотя бы один корректный email"); return; }
                setError("");
                setStep(s => s + 1);
              } else {
                inviteMutation.mutate();
              }
            }}
            disabled={inviteMutation.isPending}
            className="px-5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
            style={{ fontFamily: "inherit" }}
          >
            {step < 4 ? "Далее" : inviteMutation.isPending ? "Отправка..." : "Отправить приглашение"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE EDITOR MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RoleEditorModal({
  role,
  onClose,
}: {
  role: CustomRole | null;
  onClose: () => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [color, setColor] = useState(role?.color || ROLE_COLORS_PRESET[0]);
  const [icon, setIcon] = useState(role?.icon || "🔑");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const ICON_OPTIONS = ["🔑", "👤", "🌟", "⚡", "🎯", "🔧", "💡", "🏷️"];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      let workspace: { id: string } | null = null;
      const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      if (!ws) {
        const { data: newWs } = await supabase.from("workspaces").insert({ name: "Мой воркспейс", owner_id: user.id }).select().single();
        workspace = newWs;
      } else {
        workspace = ws;
      }

      if (role) {
        const { error: err } = await supabase.from("workspace_roles").update({
          name, description, color, icon, permissions, updated_at: new Date().toISOString(),
        }).eq("id", role.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("workspace_roles").insert({
          workspace_id: workspace!.id,
          name, description, color, icon, permissions,
          is_system: false,
          created_by: user.id,
        });
        if (err) throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const togglePerm = (key: string) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleCategory = (cat: string) => {
    const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat).map(p => p.key);
    const allSelected = catPerms.every(k => permissions.includes(k));
    setPermissions(prev => allSelected ? prev.filter(k => !catPerms.includes(k)) : [...new Set([...prev, ...catPerms])]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl mx-4 rounded-2xl border border-line shadow-2xl flex flex-col" style={{ background: "var(--panel)", maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line flex-shrink-0">
          <h2 className="text-[16px] font-semibold text-tx-1">{role ? "Редактировать роль" : "Создать роль"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover cursor-pointer text-tx-3"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-tx-2 mb-1.5 block">Название роли</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Стажёр" className={INPUT_CLS} style={{ fontFamily: "inherit" }} />
            </div>
            <div>
              <label className="text-[12px] font-medium text-tx-2 mb-1.5 block">Иконка</label>
              <div className="flex gap-1 flex-wrap">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className="w-9 h-9 rounded-lg text-[18px] flex items-center justify-center cursor-pointer border transition-colors"
                    style={{ borderColor: icon === ic ? "var(--accent)" : "var(--line)", background: icon === ic ? "rgba(255,90,54,0.08)" : "var(--panel-2)" }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-tx-2 mb-1.5 block">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Описание роли и её обязанностей" className={INPUT_CLS + " resize-none"} style={{ fontFamily: "inherit" }} />
          </div>

          <div>
            <label className="text-[12px] font-medium text-tx-2 mb-1.5 block">Цвет</label>
            <div className="flex gap-2">
              {ROLE_COLORS_PRESET.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                >
                  {color === c && <Check size={13} color="#fff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-tx-1 mb-3">Права доступа</p>
            <div className="space-y-2">
              {PERMISSION_CATEGORIES.map((cat) => {
                const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat.key);
                const selectedCount = catPerms.filter(p => permissions.includes(p.key)).length;
                const allSel = selectedCount === catPerms.length;
                const isOpen = !collapsed[cat.key];
                return (
                  <div key={cat.key} className="rounded-xl border border-line overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--panel-2)" }}>
                      <button onClick={() => setCollapsed(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))} className="flex items-center gap-2 text-left cursor-pointer flex-1">
                        <span className="text-[14px]">{cat.icon}</span>
                        <span className="text-[13px] font-medium text-tx-1">{cat.label}</span>
                        <span className="text-[11px] text-tx-3">({selectedCount}/{catPerms.length})</span>
                        <ChevronRight size={13} className="text-tx-3 ml-1 transition-transform" style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />
                      </button>
                      <button
                        onClick={() => toggleCategory(cat.key)}
                        className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ml-3 transition-colors"
                        style={{ color: allSel ? "var(--accent)" : "var(--tx-3)", background: allSel ? "rgba(255,90,54,0.08)" : "var(--hover)" }}
                      >
                        {allSel ? "Снять все" : "Выбрать все"}
                      </button>
                    </div>
                    {isOpen && (
                      <div className="divide-y divide-line">
                        {catPerms.map((p) => (
                          <label key={p.key} className="flex items-start gap-3 px-4 py-2.5 hover:bg-hover cursor-pointer">
                            <input type="checkbox" checked={permissions.includes(p.key)} onChange={() => togglePerm(p.key)} className="mt-0.5 accent-accent flex-shrink-0" />
                            <div>
                              <p className="text-[13px] text-tx-1">{p.label}</p>
                              <p className="text-[11px] text-tx-3">{p.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[12px] text-neg">{error}</p>}
          {role && role.member_count !== undefined && (
            <p className="text-[12px] text-tx-3">Участников с этой ролью: {role.member_count}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 border border-line rounded-[10px] text-[13px] text-tx-2 hover:bg-hover cursor-pointer" style={{ fontFamily: "inherit" }}>Отмена</button>
          <button
            onClick={() => { if (!name.trim()) { setError("Введите название роли"); return; } saveMutation.mutate(); }}
            disabled={saveMutation.isPending}
            className="px-5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{ fontFamily: "inherit" }}
          >
            {saveMutation.isPending ? "Сохранение..." : role ? "Сохранить" : "Создать роль"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: УЧАСТНИКИ
// ─────────────────────────────────────────────────────────────────────────────

function MembersTab({
  members,
  isLoading,
  customRoles,
  onInvite,
}: {
  members: Member[];
  isLoading: boolean;
  customRoles: CustomRole[];
  onInvite: () => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [bulkRole, setBulkRole] = useState("");

  const allRoleOptions = [
    ...SYSTEM_ROLES.map(r => ({ key: r.key, label: r.label, color: r.color })),
    ...customRoles.map(r => ({ key: r.id, label: r.name, color: r.color })),
  ];

  const filtered = members.filter((m) => {
    const matchSearch = !search || (m.email || "").toLowerCase().includes(search.toLowerCase()) || (m.display_name || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(m => m.id));

  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.from("workspace_members").update({
        status: blocked ? "blocked" : "active",
        blocked_at: blocked ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });

  const bulkUpdateRole = async () => {
    if (!bulkRole) return;
    for (const id of selected) {
      await supabase.from("workspace_members").update({ role: bulkRole }).eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["team-members"] });
    setSelected([]);
    setBulkRole("");
  };

  const bulkRemove = async () => {
    for (const id of selected) {
      await supabase.from("workspace_members").delete().eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["team-members"] });
    setSelected([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени или email" className={INPUT_CLS + " pl-8"} style={{ fontFamily: "inherit" }} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={INPUT_CLS + " w-auto cursor-pointer"} style={{ fontFamily: "inherit" }}>
          <option value="all">Все роли</option>
          {allRoleOptions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLS + " w-auto cursor-pointer"} style={{ fontFamily: "inherit" }}>
          <option value="all">Все статусы</option>
          <option value="active">Активен</option>
          <option value="pending">Приглашён</option>
          <option value="blocked">Заблокирован</option>
        </select>
        <button onClick={onInvite} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer whitespace-nowrap" style={{ fontFamily: "inherit" }}>
          <Plus size={14} strokeWidth={2.2} /> Пригласить
        </button>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-line" style={{ background: "var(--panel-2)" }}>
          <span className="text-[13px] text-tx-2">Выбрано: <strong className="text-tx-1">{selected.length}</strong></span>
          <div className="flex items-center gap-2 ml-auto">
            <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className={INPUT_CLS + " w-auto cursor-pointer"} style={{ fontFamily: "inherit" }}>
              <option value="">Изменить роль...</option>
              {allRoleOptions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            {bulkRole && (
              <button onClick={bulkUpdateRole} className="px-3 py-2.5 bg-accent text-on-accent text-[13px] rounded-[10px] hover:opacity-90 cursor-pointer" style={{ fontFamily: "inherit" }}>Применить</button>
            )}
            <button onClick={bulkRemove} className="px-3 py-2.5 border border-neg text-neg text-[13px] rounded-[10px] cursor-pointer" style={{ fontFamily: "inherit" }}>Удалить выбранных</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--panel-2)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-line" style={{ background: "var(--panel-2)" }}>
          <Users size={32} className="text-tx-3 mb-3" strokeWidth={1.4} />
          <p className="text-[15px] font-semibold text-tx-1 mb-1">Команда пока пуста</p>
          <p className="text-[12.5px] text-tx-3 mb-4">Пригласите первого участника</p>
          <button onClick={onInvite} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer" style={{ fontFamily: "inherit" }}>
            <Plus size={14} strokeWidth={2.2} /> Пригласить первого
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line overflow-hidden" style={{ background: "var(--panel)" }}>
          <div
            className="grid gap-3 px-4 py-2.5 border-b border-line text-[11px] font-semibold text-tx-3 uppercase tracking-wide items-center"
            style={{ gridTemplateColumns: "36px 1fr 160px 140px 130px 100px 40px", background: "var(--panel-2)" }}
          >
            <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-accent" />
            <span>Участник</span>
            <span>Роль</span>
            <span>Проекты</span>
            <span>Активность</span>
            <span>Статус</span>
            <span />
          </div>
          {filtered.map((m) => (
            <div
              key={m.id}
              className="grid gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-hover items-center transition-colors"
              style={{ gridTemplateColumns: "36px 1fr 160px 140px 130px 100px 40px" }}
            >
              <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSelect(m.id)} className="accent-accent" />
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: getRoleInfo(m.role, customRoles).color, color: "#fff" }}
                >
                  {getInitials(m.display_name, m.email)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-tx-1 truncate">{m.display_name || m.email || "—"}</p>
                  {m.display_name && <p className="text-[11px] text-tx-3 truncate">{m.email}</p>}
                </div>
              </div>
              <div><RoleBadge roleKey={m.role} customRoles={customRoles} /></div>
              <div className="text-[12px] text-tx-2">{m.project_ids && m.project_ids.length > 0 ? `${m.project_ids.length} проект(-ов)` : "Все проекты"}</div>
              <div className="text-[12px] text-tx-3">{formatDate(m.last_active_at || m.created_at)}</div>
              <div><StatusBadge status={m.status} /></div>
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-hover cursor-pointer text-tx-3"
                >
                  <MoreHorizontal size={14} />
                </button>
                {openMenu === m.id && (
                  <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-line shadow-xl overflow-hidden" style={{ background: "var(--panel)" }}>
                    <button
                      className="w-full text-left px-4 py-2.5 text-[13px] text-tx-1 hover:bg-hover cursor-pointer flex items-center gap-2"
                      onClick={() => { blockMutation.mutate({ id: m.id, blocked: m.status !== "blocked" }); setOpenMenu(null); }}
                    >
                      {m.status === "blocked" ? <><UserCheck size={13} /> Разблокировать</> : <><UserX size={13} /> Заблокировать</>}
                    </button>
                    <button
                      className="w-full text-left px-4 py-2.5 text-[13px] text-neg hover:bg-hover cursor-pointer flex items-center gap-2"
                      onClick={() => { removeMutation.mutate(m.id); setOpenMenu(null); }}
                    >
                      <Trash2 size={13} /> Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ПРИГЛАШЕНИЯ
// ─────────────────────────────────────────────────────────────────────────────

function InvitationsTab({
  customRoles,
  onInvite,
}: {
  customRoles: CustomRole[];
  onInvite: () => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["workspace-invitations"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("workspace_invitations").select("*").order("created_at", { ascending: false });
        if (error) return [] as Invitation[];
        return (data || []) as Invitation[];
      } catch {
        return [] as Invitation[];
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workspace_invitations").update({ status: "revoked" }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-invitations"] }),
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workspace_invitations").update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-invitations"] }),
  });

  const pendingCount = invitations.filter(i => i.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-tx-1">Ожидают принятия</h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-on-accent bg-accent">{pendingCount}</span>
          )}
        </div>
        <button onClick={onInvite} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer" style={{ fontFamily: "inherit" }}>
          <Plus size={14} /> Новое приглашение
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--panel-2)" }} />)}</div>
      ) : invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-line text-center" style={{ background: "var(--panel-2)" }}>
          <UserCheck size={32} className="text-tx-3 mb-3" strokeWidth={1.4} />
          <p className="text-[15px] font-semibold text-tx-1 mb-1">Нет активных приглашений</p>
          <p className="text-[12px] text-tx-3 mb-1">Таблица workspace_invitations может быть не создана</p>
          <p className="text-[11px] text-tx-3 mb-4">Примените SQL-миграцию 20260622_team_rbac.sql</p>
          <button onClick={onInvite} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer" style={{ fontFamily: "inherit" }}>
            <Plus size={14} /> Пригласить
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line overflow-hidden" style={{ background: "var(--panel)" }}>
          <div
            className="grid px-4 py-2.5 border-b border-line text-[11px] font-semibold text-tx-3 uppercase tracking-wide"
            style={{ gridTemplateColumns: "1fr 160px 130px 130px 90px 130px", background: "var(--panel-2)" }}
          >
            <span>Email</span><span>Роль</span><span>Кем приглашён</span><span>Отправлено</span><span>Истекает</span><span>Действия</span>
          </div>
          {invitations.map((inv) => {
            const expired = isExpired(inv.expires_at);
            return (
              <div
                key={inv.id}
                className="grid px-4 py-3 border-b border-line last:border-0 hover:bg-hover items-center transition-colors"
                style={{ gridTemplateColumns: "1fr 160px 130px 130px 90px 130px" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-chip flex items-center justify-center text-[11px] font-semibold text-tx-2 flex-shrink-0">
                    {inv.email[0].toUpperCase()}
                  </div>
                  <span className="text-[13px] text-tx-1 truncate">{inv.email}</span>
                </div>
                <div><RoleBadge roleKey={inv.role} customRoles={customRoles} /></div>
                <div className="text-[12px] text-tx-3">{inv.invited_by ? "Владелец" : "—"}</div>
                <div className="text-[12px] text-tx-3">{formatDate(inv.created_at)}</div>
                <div>
                  {expired ? (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "var(--neg)" }}>Истёк</span>
                  ) : (
                    <span className="text-[12px] text-tx-3">{formatDate(inv.expires_at)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => resendMutation.mutate(inv.id)} className="text-[12px] text-accent hover:underline cursor-pointer flex items-center gap-1">
                    <RotateCcw size={11} /> Повторно
                  </button>
                  <button onClick={() => revokeMutation.mutate(inv.id)} className="text-[12px] text-neg hover:underline cursor-pointer">
                    Отозвать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: РОЛИ
// ─────────────────────────────────────────────────────────────────────────────

function RolesTab({
  customRoles,
  isLoading,
  members,
  onCreateRole,
  onEditRole,
}: {
  customRoles: CustomRole[];
  isLoading: boolean;
  members: Member[];
  onCreateRole: () => void;
  onEditRole: (role: CustomRole) => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [viewPerms, setViewPerms] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-roles"] }),
  });

  const getMemberCount = (roleKey: string) => members.filter(m => m.role === roleKey).length;

  const viewedRole: AnyRole | null = (() => {
    if (!viewPerms) return null;
    const sys = SYSTEM_ROLES.find(r => r.key === viewPerms);
    if (sys) return sys;
    return customRoles.find(r => r.id === viewPerms) || null;
  })();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={14} className="text-tx-3" />
          <h3 className="text-[14px] font-semibold text-tx-1">Системные роли</h3>
          <span className="text-[12px] text-tx-3">Встроены в платформу, изменить нельзя</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SYSTEM_ROLES.map((r) => {
            const count = getMemberCount(r.key);
            return (
              <div key={r.key} className="rounded-xl border border-line overflow-hidden" style={{ background: "var(--panel)" }}>
                <div className="h-1 w-full" style={{ background: r.color }} />
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[20px]">{r.icon}</span>
                      <div>
                        <p className="text-[13px] font-semibold text-tx-1">{r.label}</p>
                        <p className="text-[11px] text-tx-3 mt-0.5">{count} участник(-ов)</p>
                      </div>
                    </div>
                    <Lock size={12} className="text-tx-3 mt-1 flex-shrink-0" />
                  </div>
                  <p className="text-[12px] text-tx-2 mt-2 mb-3">{r.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-tx-3">{r.permissions.length} прав(-а)</span>
                    <button onClick={() => setViewPerms(r.key)} className="text-[12px] text-accent hover:underline cursor-pointer flex items-center gap-1">
                      <Eye size={11} /> Просмотреть
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-tx-1">Кастомные роли</h3>
          <button onClick={onCreateRole} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer" style={{ fontFamily: "inherit" }}>
            <Plus size={14} /> Создать роль
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--panel-2)" }} />)}</div>
        ) : customRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-line text-center" style={{ background: "var(--panel-2)" }}>
            <Shield size={28} className="text-tx-3 mb-2" strokeWidth={1.4} />
            <p className="text-[14px] font-semibold text-tx-1 mb-1">Нет кастомных ролей</p>
            <p className="text-[12px] text-tx-3 mb-4">Создайте свою роль с нужными правами</p>
            <button onClick={onCreateRole} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer" style={{ fontFamily: "inherit" }}>
              <Plus size={14} /> Создать первую роль
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customRoles.map((r) => {
              const count = getMemberCount(r.id);
              return (
                <div key={r.id} className="rounded-xl border border-line overflow-hidden" style={{ background: "var(--panel)" }}>
                  <div className="h-1 w-full" style={{ background: r.color }} />
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[20px]">{r.icon}</span>
                        <div>
                          <p className="text-[13px] font-semibold text-tx-1">{r.name}</p>
                          <p className="text-[11px] text-tx-3 mt-0.5">{count} участник(-ов)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEditRole({ ...r, member_count: count })} className="p-1.5 rounded-lg hover:bg-hover cursor-pointer text-tx-3 hover:text-tx-1 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(r.id)} className="p-1.5 rounded-lg hover:bg-hover cursor-pointer text-tx-3 hover:text-neg transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {r.description && <p className="text-[12px] text-tx-2 mt-2 mb-3">{r.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-tx-3">{r.permissions.length} прав(-а)</span>
                      <button onClick={() => setViewPerms(r.id)} className="text-[12px] text-accent hover:underline cursor-pointer flex items-center gap-1">
                        <Eye size={11} /> Просмотреть
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-line shadow-2xl flex flex-col" style={{ background: "var(--panel)", maxHeight: "80vh" }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">{viewedRole.icon}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-tx-1">{viewedRole.isSystem ? viewedRole.label : (viewedRole as CustomRole).name}</h3>
                  <p className="text-[12px] text-tx-3">{viewedRole.permissions.length} прав(-а)</p>
                </div>
              </div>
              <button onClick={() => setViewPerms(null)} className="p-1.5 rounded-lg hover:bg-hover cursor-pointer text-tx-3"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {PERMISSION_CATEGORIES.map((cat) => {
                const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat.key && viewedRole.permissions.includes(p.key));
                if (catPerms.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <p className="text-[12px] font-semibold text-tx-2 mb-2">{cat.icon} {cat.label}</p>
                    <div className="space-y-1">
                      {catPerms.map(p => (
                        <div key={p.key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--panel-2)" }}>
                          <Check size={12} style={{ color: "#0E6E56", flexShrink: 0 }} />
                          <span className="text-[12px] text-tx-1">{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ПРАВА ДОСТУПА (МАТРИЦА)
// ─────────────────────────────────────────────────────────────────────────────

function PermissionsTab({ customRoles }: { customRoles: CustomRole[] }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const allRoles: AnyRole[] = [...SYSTEM_ROLES, ...customRoles];

  const toggleCustomPerm = useMutation({
    mutationFn: async ({ roleId, permKey, current }: { roleId: string; permKey: string; current: string[] }) => {
      const next = current.includes(permKey) ? current.filter(k => k !== permKey) : [...current, permKey];
      const { error } = await supabase.from("workspace_roles").update({ permissions: next, updated_at: new Date().toISOString() }).eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-roles"] }),
  });

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-[12px] text-tx-3">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: "rgba(14,110,86,0.12)" }}>
            <Check size={10} style={{ color: "#0E6E56" }} />
          </span>
          Есть доступ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-4 rounded-sm inline-flex items-center justify-center" style={{ background: "var(--panel-2)" }}>—</span>
          Нет доступа
        </span>
        <span>Кастомные роли — кликабельны для изменения</span>
      </div>

      <div className="rounded-2xl border border-line overflow-hidden" style={{ background: "var(--panel)" }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ background: "var(--panel-2)" }}>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-tx-3 uppercase tracking-wide border-b border-r border-line sticky left-0 z-10 w-52" style={{ background: "var(--panel-2)" }}>
                  Право
                </th>
                {allRoles.map((r) => {
                  const key = r.isSystem ? r.key : (r as CustomRole).id;
                  const label = r.isSystem ? r.label : (r as CustomRole).name;
                  return (
                    <th key={key} className="px-3 py-3 text-center border-b border-line min-w-[90px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[16px]">{r.icon}</span>
                        <span className="text-[11px] font-semibold text-tx-1">{label}</span>
                        {r.isSystem && <Lock size={9} className="text-tx-3" />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_CATEGORIES.map((cat) => {
                const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat.key);
                return [
                  <tr key={`cat-${cat.key}`}>
                    <td colSpan={allRoles.length + 1} className="px-4 py-2 border-b border-line" style={{ background: "var(--panel-2)" }}>
                      <span className="text-[11px] font-bold text-tx-2 uppercase tracking-wider">{cat.icon} {cat.label}</span>
                    </td>
                  </tr>,
                  ...catPerms.map((p) => (
                    <tr key={p.key} className="border-b border-line last:border-0 hover:bg-hover transition-colors">
                      <td className="px-4 py-2.5 border-r border-line sticky left-0 z-10" style={{ background: "var(--panel)" }}>
                        <p className="text-[12px] font-medium text-tx-1">{p.label}</p>
                        <p className="text-[10px] text-tx-3">{p.desc}</p>
                      </td>
                      {allRoles.map((r) => {
                        const roleKey = r.isSystem ? r.key : (r as CustomRole).id;
                        const hasPerm = r.permissions.includes(p.key);
                        const isCustom = !r.isSystem;
                        return (
                          <td key={roleKey} className="px-3 py-2 text-center">
                            {isCustom ? (
                              <button
                                onClick={() => toggleCustomPerm.mutate({ roleId: roleKey, permKey: p.key, current: r.permissions })}
                                className="w-full flex items-center justify-center cursor-pointer"
                              >
                                {hasPerm ? (
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(14,110,86,0.12)" }}>
                                    <Check size={12} style={{ color: "#0E6E56" }} />
                                  </span>
                                ) : (
                                  <span className="w-6 h-6 rounded-md inline-flex items-center justify-center text-tx-3" style={{ border: "1px dashed var(--line)" }}>
                                    —
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="flex items-center justify-center">
                                {hasPerm ? (
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(14,110,86,0.12)" }}>
                                    <Check size={12} style={{ color: "#0E6E56" }} />
                                  </span>
                                ) : (
                                  <span className="text-[14px] text-tx-3">—</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ЖУРНАЛ ДЕЙСТВИЙ
// ─────────────────────────────────────────────────────────────────────────────

function AuditTab() {
  const supabase = createClient();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["team-audit-log"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("team_audit_log").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) return [] as AuditEntry[];
        return (data || []) as AuditEntry[];
      } catch {
        return [] as AuditEntry[];
      }
    },
  });

  const filtered = logs.filter((e) => {
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    const matchFrom = !dateFrom || new Date(e.created_at) >= new Date(dateFrom);
    const matchTo = !dateTo || new Date(e.created_at) <= new Date(dateTo + "T23:59:59");
    return matchAction && matchFrom && matchTo;
  });

  const exportCSV = () => {
    const rows = [["Дата", "Исполнитель", "Действие", "Объект"]];
    filtered.forEach(e => rows.push([formatDatetime(e.created_at), e.actor_email || "—", e.action, e.target_email || "—"]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const ACTION_OPTIONS = [
    { value: "all", label: "Все действия" },
    { value: "invite_sent", label: "Приглашение" },
    { value: "role_changed", label: "Изменение роли" },
    { value: "member_removed", label: "Удаление" },
    { value: "member_blocked", label: "Блокировка" },
    { value: "role_created", label: "Создание роли" },
    { value: "role_deleted", label: "Удаление роли" },
    { value: "invite_revoked", label: "Отзыв приглашения" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={INPUT_CLS + " w-auto"} style={{ fontFamily: "inherit" }} />
          <span className="text-tx-3 text-[12px]">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={INPUT_CLS + " w-auto"} style={{ fontFamily: "inherit" }} />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={INPUT_CLS + " w-auto cursor-pointer"} style={{ fontFamily: "inherit" }}>
          {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={exportCSV} className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-line text-[13px] text-tx-2 rounded-[10px] hover:bg-hover cursor-pointer" style={{ fontFamily: "inherit" }}>
          <Download size={13} /> Экспортировать CSV
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--panel-2)" }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-line text-center" style={{ background: "var(--panel-2)" }}>
          <Clock size={32} className="text-tx-3 mb-3" strokeWidth={1.4} />
          <p className="text-[15px] font-semibold text-tx-1 mb-1">Журнал пуст</p>
          <p className="text-[12px] text-tx-3">Действия с командой появятся здесь</p>
          <p className="text-[11px] text-tx-3 mt-1">Таблица team_audit_log может быть не создана</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="flex items-start gap-4 px-4 py-3 rounded-xl border border-line hover:bg-hover transition-colors" style={{ background: "var(--panel)" }}>
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: getAuditDotColor(entry.action) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-tx-1">
                  <span className="font-medium">{entry.actor_email || "Система"}</span>
                  {" "}
                  <span className="text-tx-2">{getAuditDescription(entry)}</span>
                </p>
              </div>
              <span className="text-[11px] text-tx-3 flex-shrink-0 mt-0.5">{formatDatetime(entry.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "members" | "invitations" | "roles" | "permissions" | "audit";

export default function TeamPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [showInvite, setShowInvite] = useState(false);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("workspace_members").select("*").order("created_at", { ascending: false });
        return (data || []) as Member[];
      } catch {
        return [] as Member[];
      }
    },
  });

  const { data: customRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("workspace_roles").select("*").eq("is_system", false);
        if (error) return [] as CustomRole[];
        return (data || []).map(r => ({ ...r, isSystem: false as const })) as CustomRole[];
      } catch {
        return [] as CustomRole[];
      }
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("projects").select("id, name").eq("is_active", true);
        return (data || []) as { id: string; name: string }[];
      } catch {
        return [] as { id: string; name: string }[];
      }
    },
  });

  const pendingCount = members.filter(m => m.status === "pending").length;

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "members", label: "Участники" },
    { key: "invitations", label: "Приглашения", badge: pendingCount },
    { key: "roles", label: "Роли" },
    { key: "permissions", label: "Права доступа" },
    { key: "audit", label: "Журнал действий" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1200px] w-full mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-accent text-on-accent text-[13px] px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-tx-3 mb-1.5">Управление доступом</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1" style={{ fontFamily: "'Unbounded', sans-serif" }}>Команда</h1>
          <p className="text-[13px] text-tx-2 mt-1">Управляйте участниками, ролями и правами доступа</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer transition-opacity"
          style={{ fontFamily: "inherit" }}
        >
          <Plus size={15} strokeWidth={2.2} /> Пригласить
        </button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              color: activeTab === tab.key ? "var(--tx-1)" : "var(--tx-3)",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              fontFamily: "inherit",
            }}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-on-accent bg-accent">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "members" && (
        <MembersTab members={members} isLoading={membersLoading} customRoles={customRoles} onInvite={() => setShowInvite(true)} />
      )}
      {activeTab === "invitations" && (
        <InvitationsTab customRoles={customRoles} onInvite={() => setShowInvite(true)} />
      )}
      {activeTab === "roles" && (
        <RolesTab
          customRoles={customRoles}
          isLoading={rolesLoading}
          members={members}
          onCreateRole={() => { setEditingRole(null); setShowRoleEditor(true); }}
          onEditRole={(r) => { setEditingRole(r); setShowRoleEditor(true); }}
        />
      )}
      {activeTab === "permissions" && <PermissionsTab customRoles={customRoles} />}
      {activeTab === "audit" && <AuditTab />}

      {showInvite && (
        <InviteModal
          onClose={() => { setShowInvite(false); showToast("Приглашения отправлены!"); }}
          customRoles={customRoles}
          projects={projects}
        />
      )}
      {showRoleEditor && (
        <RoleEditorModal
          role={editingRole}
          onClose={() => { setShowRoleEditor(false); setEditingRole(null); showToast(editingRole ? "Роль обновлена" : "Роль создана"); }}
        />
      )}
    </div>
  );
}
