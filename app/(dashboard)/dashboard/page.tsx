import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const STATS = [
  { label: "Проектов", value: "0", color: "text-[#1D9E75]" },
  { label: "Генераций", value: "0", color: "text-blue-500" },
  { label: "Запланировано", value: "0", color: "text-amber-500" },
  { label: "Опубликовано", value: "0", color: "text-purple-500" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: recentContents } = await supabase
    .from("contents")
    .select("*, projects(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Привет";

  return (
    <div className="p-4 md:p-6 max-w-5xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Главная панель</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Добро пожаловать, {firstName}!
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          ✦ Создать контент
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Мои проекты
            </span>
            <Link
              href="/projects"
              className="text-xs text-[#1D9E75] hover:underline"
            >
              Все →
            </Link>
          </div>
          {projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-sm flex-shrink-0">
                    📁
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.niche || "Без ниши"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">Нет проектов</p>
              <Link
                href="/projects"
                className="text-xs text-[#1D9E75] font-semibold hover:underline"
              >
                + Создать первый проект
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Последние генерации
            </span>
            <Link
              href="/history"
              className="text-xs text-[#1D9E75] hover:underline"
            >
              Все →
            </Link>
          </div>
          {recentContents && recentContents.length > 0 ? (
            <div className="space-y-2">
              {recentContents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm flex-shrink-0">
                    {c.type === "video"
                      ? "🎬"
                      : c.type === "post"
                        ? "📝"
                        : c.type === "stories"
                          ? "📸"
                          : "📢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.title || "Без названия"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(c.projects as any)?.name}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      c.status === "published"
                        ? "bg-blue-50 text-blue-600"
                        : c.status === "scheduled"
                          ? "bg-[#E1F5EE] text-[#1D9E75]"
                          : c.status === "generated"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.status === "published"
                      ? "Опубликовано"
                      : c.status === "scheduled"
                        ? "Запланировано"
                        : c.status === "generated"
                          ? "Готово"
                          : "Черновик"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">Нет генераций</p>
              <Link
                href="/create"
                className="text-xs text-[#1D9E75] font-semibold hover:underline"
              >
                + Создать контент
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
