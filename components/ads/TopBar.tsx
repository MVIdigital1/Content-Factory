"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { useProjects } from "@/lib/hooks/useAdsData";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

interface TopBarProps {
  onNewCampaign?: () => void;
  projectId?: string;
  onProjectChange?: (id: string) => void;
}

const COLORS = [
  "#4ABA74",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#0088CC",
];
const colorFor = (id: string) =>
  COLORS[(id?.charCodeAt(0) ?? 0) % COLORS.length];
const initials = (name: string) => name?.slice(0, 1).toUpperCase() ?? "?";

export function TopBar({
  onNewCampaign,
  projectId,
  onProjectChange,
}: TopBarProps) {
  const locale = useLocale();
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const [dropOpen, setDropOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [projectModal, setProjectModal] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editNiche, setEditNiche] = useState("");
  const [stopping, setStopping] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const activeProject =
    projects.find((p: any) => p.id === projectId) ?? projects[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("light", !next);
  };

  const openProjectModal = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectModal(p);
    setEditName(p.name);
    setEditNiche(p.niche ?? "");
    setDropOpen(false);
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          niche: newProjectNiche.trim() || null,
          is_active: true,
          language: "ru",
          tone: "friendly",
        }),
      });
      const data = res.ok ? await res.json() : null;
      qc.invalidateQueries({ queryKey: ["projects"] });
      if (data) onProjectChange?.(data.id);
      setCreateProjectModal(false);
      setNewProjectName("");
      setNewProjectNiche("");
    } finally {
      setCreating(false);
    }
  };

  const saveProject = async () => {
    if (!projectModal) return;
    await fetch(`/api/projects/${projectModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, niche: editNiche }),
    });
    qc.invalidateQueries({ queryKey: ["projects"] });
    setProjectModal(null);
  };

  const deleteProject = async () => {
    if (!projectModal || !confirm("Удалить проект? Все данные будут потеряны."))
      return;
    await fetch(`/api/projects/${projectModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    qc.invalidateQueries({ queryKey: ["projects"] });
    setProjectModal(null);
  };

  const stopProject = async () => {
    if (!projectModal || !confirm("Остановить все кампании проекта?")) return;
    setStopping(true);
    await Promise.all([
      fetch(`/api/campaigns?project_id=${projectModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      }),
      fetch(`/api/scheduled-posts?project_id=${projectModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed" }),
      }),
    ]);
    qc.invalidateQueries({ queryKey: ["ad_campaigns"] });
    setStopping(false);
    setProjectModal(null);
  };

  const [createProjectModal, setCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectNiche, setNewProjectNiche] = useState("");
  const [creating, setCreating] = useState(false);

  const fi: React.CSSProperties = {
    width: "100%",
    padding: "8px 11px",
    fontSize: 12,
    fontFamily: "inherit",
    border: "0.5px solid var(--border)",
    borderRadius: 7,
    background: "var(--bg)",
    color: "var(--text-primary)",
    outline: "none",
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 14px",
          flexShrink: 0,
          borderBottom: "0.5px solid var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: "var(--text-primary)",
            }}
          >
            Post<span style={{ color: "var(--primary)" }}>Centro</span>
          </div>

          {/* Company switcher */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropOpen(!dropOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 10px",
                borderRadius: 7,
                border: "0.5px solid var(--border)",
                background: "var(--bg-card)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {activeProject ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: colorFor(activeProject.id),
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {initials(activeProject.name)}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {activeProject.name}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Выберите проект
                </span>
              )}
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                ▾
              </span>
            </button>

            {dropOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 5,
                  background: "var(--bg-card)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 9,
                  padding: 6,
                  minWidth: 220,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    padding: "4px 8px 6px",
                  }}
                >
                  Рабочие пространства
                </div>
                {projects.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      background:
                        p.id === projectId
                          ? "var(--bg-tertiary)"
                          : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      onProjectChange?.(p.id);
                      setDropOpen(false);
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: colorFor(p.id),
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {initials(p.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12 }}>{p.name}</div>
                      {p.niche && (
                        <div
                          style={{ fontSize: 10, color: "var(--text-muted)" }}
                        >
                          {p.niche}
                        </div>
                      )}
                    </div>
                    {p.id === projectId && (
                      <span style={{ color: "var(--primary)", fontSize: 11 }}>
                        ✓
                      </span>
                    )}
                    <button
                      onClick={(e) => openProjectModal(p, e)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        fontSize: 12,
                        padding: "2px 5px",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                      title="Настройки проекта"
                    >
                      ⋯
                    </button>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      padding: 8,
                    }}
                  >
                    Нет проектов
                  </div>
                )}
                <div
                  style={{
                    borderTop: "0.5px solid var(--border)",
                    margin: "6px 0 4px",
                  }}
                />
                <button
                  onClick={() => {
                    setDropOpen(false);
                    setCreateProjectModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "var(--primary)",
                    fontWeight: 500,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  + Добавить проект
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {isDark ? "🌙" : "☀️"}
            </span>
            <Toggle defaultOn={true} onChange={toggleTheme} />
          </div>
          <Link
            href={`/${locale}/content`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 11px",
              borderRadius: 7,
              border: "0.5px solid var(--border)",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: 11,
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ✦ Создать контент
          </Link>
          <Button variant="primary" size="md" onClick={onNewCampaign}>
            + Новая кампания
          </Button>
        </div>
      </div>

      {/* Project settings modal */}
      <Modal
        open={!!projectModal}
        onClose={() => setProjectModal(null)}
        title={`Проект: ${projectModal?.name}`}
        size="sm"
      >
        {projectModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                  fontWeight: 500,
                }}
              >
                Название
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={fi}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                  fontWeight: 500,
                }}
              >
                Ниша / тип бизнеса
              </label>
              <input
                value={editNiche}
                onChange={(e) => setEditNiche(e.target.value)}
                placeholder="Например: e-commerce, услуги..."
                style={fi}
              />
            </div>

            {/* Stats */}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 8,
                padding: "11px 13px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                Статус проекта
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span
                  style={{
                    background: "var(--success-bg)",
                    color: "var(--success-text)",
                    padding: "3px 9px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Активен
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="ghost"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setProjectModal(null)}
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={saveProject}
                >
                  Сохранить
                </Button>
              </div>
              <button
                onClick={stopProject}
                disabled={stopping}
                style={{
                  width: "100%",
                  padding: "9px",
                  border: "0.5px solid var(--warning)",
                  borderRadius: 7,
                  background: "var(--warning-bg)",
                  color: "var(--warning-text)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {stopping ? "Останавливаю..." : "⏸ Остановить все кампании"}
              </button>
              <button
                onClick={deleteProject}
                style={{
                  width: "100%",
                  padding: "9px",
                  border: "0.5px solid var(--danger)",
                  borderRadius: 7,
                  background: "var(--danger-bg)",
                  color: "var(--danger-text)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🗑 Удалить проект
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Create project modal */}
      <Modal
        open={createProjectModal}
        onClose={() => setCreateProjectModal(false)}
        title="Новый проект"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              Название *
            </label>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Например: Пятый элемент"
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              style={{
                width: "100%",
                padding: "8px 11px",
                fontSize: 12,
                fontFamily: "inherit",
                border: "0.5px solid var(--border)",
                borderRadius: 7,
                background: "var(--bg)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              Ниша / тип бизнеса
            </label>
            <input
              value={newProjectNiche}
              onChange={(e) => setNewProjectNiche(e.target.value)}
              placeholder="Например: e-commerce, бытовая химия..."
              style={{
                width: "100%",
                padding: "8px 11px",
                fontSize: 12,
                fontFamily: "inherit",
                border: "0.5px solid var(--border)",
                borderRadius: 7,
                background: "var(--bg)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button
              variant="ghost"
              onClick={() => setCreateProjectModal(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={createProject}
              style={{ opacity: creating || !newProjectName.trim() ? 0.7 : 1 }}
            >
              {creating ? "Создание..." : "Создать проект"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
