"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Users } from "lucide-react";

type Member = {
  id: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  user_id: string | null;
};

const ROLES = [
  { value: "admin", label: "Администратор", text: "text-c-2" },
  { value: "smm", label: "SMM", text: "text-accent" },
  { value: "designer", label: "Дизайнер", text: "text-c-3" },
  { value: "copywriter", label: "Копирайтер", text: "text-c-3" },
  { value: "client", label: "Клиент", text: "text-accent" },
  { value: "viewer", label: "Наблюдатель", text: "text-tx-3" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["Все действия", "Управление командой", "Публикация"],
  smm: ["Создание контента", "Публикация", "Аналитика"],
  designer: ["Создание контента", "Загрузка файлов"],
  copywriter: ["Создание контента", "Редактирование"],
  client: ["Просмотр", "Согласование"],
  viewer: ["Только просмотр"],
};

export default function TeamPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("smm");
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("workspace_members")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Member[];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      let { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!workspace) {
        const { data: newWs } = await supabase
          .from("workspaces")
          .insert({ name: "Мой воркспейс", owner_id: user.id })
          .select()
          .single();
        workspace = newWs;
      }
      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: workspace!.id,
        email,
        role,
        invited_by: user.id,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setInviteEmail("");
      setShowInvite(false);
      setSuccess("Приглашение отправлено!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (e: any) => setError(e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });

  const getRoleStyle = (role: string) =>
    ROLES.find((r) => r.value === role)?.text || "text-tx-2";

  const field =
    "px-3 py-2.5 border border-line rounded-[10px] text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div className="p-6 md:p-8 max-w-4xl w-full">
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-on-accent text-[13px] px-4 py-2.5 rounded-xl shadow-lg">
          {success}
        </div>
      )}

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="ui-label">Доступы</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
            Команда
          </h1>
          <p className="text-[13px] text-tx-2 mt-1">
            Управляй доступом и ролями
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.2} /> Пригласить
        </button>
      </div>

      {showInvite && (
        <div className="ui-surface p-5 mb-5">
          <h3 className="text-[14px] font-semibold text-tx-1 mb-4">
            Пригласить участника
          </h3>
          {error && <p className="text-[13px] text-neg mb-3">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@company.com"
              className={`flex-1 ${field}`}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={`${field} cursor-pointer`}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
              }
              disabled={!inviteEmail || inviteMutation.isPending}
              className="px-4 py-2.5 bg-accent text-on-accent text-[13px] rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {inviteMutation.isPending ? "..." : "Отправить"}
            </button>
            <button
              onClick={() => {
                setShowInvite(false);
                setError("");
              }}
              className="px-4 py-2.5 border border-line text-tx-2 text-[13px] rounded-[10px] hover:bg-hover cursor-pointer"
            >
              Отмена
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <div
                key={r.value}
                className="px-3 py-2 rounded-lg bg-panel-2 border border-line text-[12px]"
              >
                <p className={`font-semibold mb-1 ${r.text}`}>{r.label}</p>
                <p className="text-tx-3">
                  {ROLE_PERMISSIONS[r.value]?.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-panel-2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="ui-surface flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-4">
            <Users size={22} className="text-accent" strokeWidth={1.6} />
          </div>
          <p className="text-[15px] font-semibold text-tx-1 mb-1">
            Команда пока пуста
          </p>
          <p className="text-[12.5px] text-tx-3 mb-4">
            Пригласи первого участника
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.2} /> Пригласить
          </button>
        </div>
      ) : (
        <div className="ui-surface overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-panel-2 border-b border-line">
            <div className="col-span-4 ui-label">Участник</div>
            <div className="col-span-3 ui-label">Роль</div>
            <div className="col-span-3 ui-label">Статус</div>
            <div className="col-span-2 ui-label">Действия</div>
          </div>
          {members.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-line last:border-0 hover:bg-hover items-center"
            >
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center text-[13px] font-semibold text-accent flex-shrink-0">
                    {m.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <p className="text-[13px] text-tx-1 truncate">
                    {m.email || "—"}
                  </p>
                </div>
              </div>
              <div className="col-span-3">
                <select
                  value={m.role}
                  onChange={(e) =>
                    updateRoleMutation.mutate({
                      id: m.id,
                      role: e.target.value,
                    })
                  }
                  className={`text-[12px] px-2.5 py-1 rounded-full font-medium border-0 outline-none cursor-pointer bg-chip ${getRoleStyle(m.role)}`}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <span
                  className={`text-[12px] px-2.5 py-1 rounded-full font-medium ${m.status === "active" ? "bg-accent-dim text-accent" : "bg-chip text-c-3"}`}
                >
                  {m.status === "active" ? "Активен" : "Ожидает"}
                </span>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => removeMutation.mutate(m.id)}
                  className="text-[12px] text-tx-3 hover:text-neg transition-colors cursor-pointer"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
