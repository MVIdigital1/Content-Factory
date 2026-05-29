"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  user_id: string | null;
};

const ROLES = [
  {
    value: "admin",
    label: "Администратор",
    color: "bg-purple-100 text-purple-700",
  },
  { value: "smm", label: "SMM", color: "bg-blue-100 text-blue-700" },
  { value: "designer", label: "Дизайнер", color: "bg-pink-100 text-pink-700" },
  {
    value: "copywriter",
    label: "Копирайтер",
    color: "bg-amber-100 text-amber-700",
  },
  { value: "client", label: "Клиент", color: "bg-green-100 text-green-700" },
  { value: "viewer", label: "Наблюдатель", color: "bg-gray-100 text-gray-600" },
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

      // Получить или создать workspace
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
    ROLES.find((r) => r.value === role)?.color || "bg-gray-100 text-gray-600";

  const getRoleLabel = (role: string) =>
    ROLES.find((r) => r.value === role)?.label || role;

  return (
    <div className="p-6 max-w-4xl w-full">
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Команда</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Управляй доступом и ролями
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] transition-colors cursor-pointer"
        >
          + Пригласить
        </button>
      </div>

      {/* Форма приглашения */}
      {showInvite && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Пригласить участника
          </h3>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@company.com"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75] bg-white cursor-pointer"
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
              className="px-4 py-2.5 bg-[#1D9E75] text-white text-sm rounded-lg hover:bg-[#0F6E56] disabled:opacity-50 cursor-pointer"
            >
              {inviteMutation.isPending ? "..." : "Отправить"}
            </button>
            <button
              onClick={() => {
                setShowInvite(false);
                setError("");
              }}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Отмена
            </button>
          </div>

          {/* Описание ролей */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <div
                key={r.value}
                className={`px-3 py-2 rounded-lg ${r.color} text-xs`}
              >
                <p className="font-semibold mb-1">{r.label}</p>
                <p className="opacity-70">
                  {ROLE_PERMISSIONS[r.value]?.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Список участников */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            Команда пока пуста
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Пригласи первого участника
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer"
          >
            + Пригласить
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="col-span-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Участник
            </div>
            <div className="col-span-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Роль
            </div>
            <div className="col-span-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Статус
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Действия
            </div>
          </div>
          {members.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 items-center"
            >
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center text-sm font-semibold text-[#1D9E75] flex-shrink-0">
                    {m.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <p className="text-sm text-gray-900 truncate">
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
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${getRoleStyle(m.role)}`}
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
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${m.status === "active" ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-amber-50 text-amber-600"}`}
                >
                  {m.status === "active" ? "Активен" : "Ожидает"}
                </span>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => removeMutation.mutate(m.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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
