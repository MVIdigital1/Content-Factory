"use client";
import { useState } from "react";
import {
  useAdRecommendations,
  useUpdateRecommendation,
  useAdAutoRules,
  useCreateAutoRule,
  useToggleAutoRule,
  useDeleteAutoRule,
} from "@/lib/hooks/useAdsData";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

const AI_AGENTS: Record<
  string,
  { name: string; role: string; avatar: string; color: string }
> = {
  urgent: {
    name: "AI Ad Manager",
    role: "Оптимизация",
    avatar: "✦",
    color: "#c1121f",
  },
  opportunity: {
    name: "AI Analyst",
    role: "Аналитика",
    avatar: "↑",
    color: "#3a7d6b",
  },
  idea: {
    name: "AI SMM Manager",
    role: "Стратегия",
    avatar: "◎",
    color: "#2563eb",
  },
  antifraud: {
    name: "AI Security",
    role: "Защита",
    avatar: "🛡",
    color: "#b5500a",
  },
};

const TYPE_LABEL: Record<string, string> = {
  urgent: "Срочно",
  opportunity: "Возможность",
  idea: "Идея",
  antifraud: "Anti-fraud",
};

const TYPE_COLOR: Record<string, string> = {
  urgent: "#c1121f",
  opportunity: "#3a7d6b",
  idea: "#2563eb",
  antifraud: "#b5500a",
};

export function RightPanel({ projectId }: { projectId?: string }) {
  const { data: recs = [], isLoading: recsLoading } = useAdRecommendations();
  const updateRec = useUpdateRecommendation();
  const { data: rules = [], isLoading: rulesLoading } =
    useAdAutoRules(projectId);
  const createRule = useCreateAutoRule();
  const toggleRule = useToggleAutoRule();
  const deleteRule = useDeleteAutoRule();

  const [ruleModal, setRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    condition_field: "ctr",
    condition_op: "lt",
    condition_value: "",
    action_type: "pause",
  });

  const addRule = async () => {
    if (!newRule.name) return;
    await createRule.mutateAsync({
      ...newRule,
      condition_value: Number(newRule.condition_value),
      is_active: true,
      project_id: projectId,
    } as any);
    setNewRule({
      name: "",
      condition_field: "ctr",
      condition_op: "lt",
      condition_value: "",
      action_type: "pause",
    });
    setRuleModal(false);
  };

  const inp =
    "w-full px-3 py-2 rounded-[7px] border border-line text-[11px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div
      style={{
        width: 255,
        flexShrink: 0,
        borderLeft: "1px solid var(--line)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {/* AI Header */}
        <div className="ui-surface p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">✦</span>
            <span className="text-[11px] font-semibold text-tx-1">
              AI Ad Manager
            </span>
            <span className="ml-auto text-[9px] font-medium px-2 py-0.5 rounded-full bg-chip text-pos">
              Активен
            </span>
          </div>
          <p className="text-[10px] text-tx-3 leading-relaxed">
            Работает 24/7 над оптимизацией.
          </p>
        </div>

        {/* Recommendations */}
        <div className="ui-label mb-2">Рекомендации · {recs.length}</div>

        {recsLoading && (
          <p className="text-[11px] text-tx-3 px-1 mb-3">Загрузка...</p>
        )}

        {!recsLoading && recs.length === 0 && (
          <div className="text-center py-4 mb-3">
            <p className="text-[11px] text-tx-3">✓ Новых рекомендаций нет</p>
          </div>
        )}

        {recs.map((rec) => {
          const agent = AI_AGENTS[rec.type] ?? AI_AGENTS.idea;
          const typeColor = TYPE_COLOR[rec.type] ?? "#2563eb";
          const typeLabel = TYPE_LABEL[rec.type] ?? "Совет";
          return (
            <div key={rec.id} className="ui-surface p-3 mb-2">
              {/* Agent header */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-line">
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `${typeColor}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: typeColor,
                    flexShrink: 0,
                  }}
                >
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-tx-1 leading-none">
                    {agent.name}
                  </p>
                  <p className="text-[9px] text-tx-3 mt-0.5">{agent.role}</p>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 10,
                    background: `${typeColor}15`,
                    color: typeColor,
                  }}
                >
                  {typeLabel}
                </span>
                <button
                  onClick={() =>
                    updateRec.mutate({ id: rec.id, status: "dismissed" })
                  }
                  className="w-5 h-5 flex items-center justify-center rounded text-tx-3 hover:bg-hover cursor-pointer text-[11px]"
                >
                  ✕
                </button>
              </div>

              {/* Message from agent */}
              <p className="text-[11px] font-medium text-tx-1 mb-1 leading-snug">
                {rec.title}
              </p>
              <p className="text-[10px] text-tx-2 leading-relaxed mb-2">
                {rec.description}
              </p>

              {rec.action_type && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      updateRec.mutate({ id: rec.id, status: "applied" })
                    }
                    className="flex-1 py-1.5 text-[10px] font-semibold rounded-[6px] cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ background: typeColor, color: "#fff" }}
                  >
                    Применить
                  </button>
                  <button className="px-2.5 py-1.5 text-[10px] text-tx-3 border border-line rounded-[6px] cursor-pointer hover:bg-hover">
                    Детали
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Auto Rules */}
        <div className="border-t border-line mt-2 pt-3">
          <div className="ui-label mb-2">Автоправила · {rules.length}</div>

          {rulesLoading && (
            <p className="text-[11px] text-tx-3 px-1">Загрузка...</p>
          )}

          {!rulesLoading && (
            <div className="ui-surface overflow-hidden mb-2">
              {rules.length === 0 && (
                <p className="text-[10px] text-tx-3 px-3 py-2">Нет правил</p>
              )}
              {rules.map((rule, i) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-2 px-3 py-2 ${i < rules.length - 1 ? "border-b border-line" : ""}`}
                >
                  <Toggle
                    defaultOn={rule.is_active}
                    onChange={(on) =>
                      toggleRule.mutate({ id: rule.id, is_active: on })
                    }
                  />
                  <span
                    className={`flex-1 text-[10px] truncate ${rule.is_active ? "text-tx-1" : "text-tx-3"}`}
                  >
                    {rule.name}
                  </span>
                  <button
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="text-tx-3 hover:text-neg cursor-pointer text-[11px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setRuleModal(true)}
            className="w-full py-1.5 text-[11px] text-tx-2 border border-line rounded-[7px] hover:bg-hover cursor-pointer"
          >
            + Добавить правило
          </button>
        </div>
      </div>

      {/* Rule modal */}
      <Modal
        open={ruleModal}
        onClose={() => setRuleModal(false)}
        title="Новое автоправило"
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
              Название
            </label>
            <input
              type="text"
              value={newRule.name}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Пауза при CTR < 1%"
              className={inp}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                Метрика
              </label>
              <select
                value={newRule.condition_field}
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, condition_field: e.target.value }))
                }
                className={inp}
              >
                <option value="ctr">CTR</option>
                <option value="cpl">CPL</option>
                <option value="roas">ROAS</option>
                <option value="budget_spent">Расход</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                Условие
              </label>
              <select
                value={newRule.condition_op}
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, condition_op: e.target.value }))
                }
                className={inp}
              >
                <option value="lt">&lt;</option>
                <option value="gt">&gt;</option>
                <option value="lte">≤</option>
                <option value="gte">≥</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                Значение
              </label>
              <input
                type="number"
                value={newRule.condition_value}
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, condition_value: e.target.value }))
                }
                className={inp}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
              Действие
            </label>
            <select
              value={newRule.action_type}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, action_type: e.target.value }))
              }
              className={inp}
            >
              <option value="pause">Поставить на паузу</option>
              <option value="stop">Остановить</option>
              <option value="increase_budget">Увеличить бюджет</option>
              <option value="decrease_budget">Уменьшить бюджет</option>
              <option value="notify">Уведомить</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setRuleModal(false)}
              className="flex-1 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={addRule}
              disabled={createRule.isPending}
              className="flex-1 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {createRule.isPending ? "Сохранение..." : "Создать"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
