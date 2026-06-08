"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import {
  useAdRecommendations,
  useUpdateRecommendation,
  useAdAutoRules,
  useCreateAutoRule,
  useToggleAutoRule,
  useDeleteAutoRule,
} from "@/lib/hooks/useAdsData";
import type { AdRecommendationType } from "@/lib/supabase/types";

const REC_META: Record<
  string,
  { icon: string; badge: string; variant: any; iconColor: string }
> = {
  urgent: {
    icon: "⚠",
    badge: "Срочно",
    variant: "danger",
    iconColor: "var(--danger)",
  },
  opportunity: {
    icon: "↑",
    badge: "Возможность",
    variant: "success",
    iconColor: "var(--success)",
  },
  idea: { icon: "◎", badge: "Идея", variant: "info", iconColor: "var(--info)" },
  antifraud: {
    icon: "🛡",
    badge: "Anti-fraud",
    variant: "warning",
    iconColor: "var(--warning)",
  },
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

  return (
    <div
      style={{
        width: 255,
        flexShrink: 0,
        borderLeft: "0.5px solid var(--border)",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: 11 }}>
        {/* AI Header */}
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: 10,
            padding: 11,
            marginBottom: 9,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 14 }}>✦</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>AI Ad Manager</span>
            <div style={{ marginLeft: "auto" }}>
              <Badge variant="accent">Активен</Badge>
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Работает 24/7 над оптимизацией.
          </div>
        </div>

        {/* Recommendations */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 8,
            padding: "0 3px",
          }}
        >
          Рекомендации · {recs.length}
        </div>

        {recsLoading && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              padding: "8px 4px",
            }}
          >
            Загрузка...
          </div>
        )}

        {!recsLoading && recs.length === 0 && (
          <div
            style={{
              padding: "14px 8px",
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            ✓ Новых рекомендаций нет
          </div>
        )}

        {recs.map((rec) => {
          const m = REC_META[rec.type] ?? REC_META.idea;
          return (
            <div
              key={rec.id}
              style={{
                background: "var(--bg-card)",
                border: "0.5px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                marginBottom: 7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: m.iconColor, fontSize: 11 }}>
                  {m.icon}
                </span>
                <Badge variant={m.variant}>{m.badge}</Badge>
                <button
                  onClick={() =>
                    updateRec.mutate({ id: rec.id, status: "dismissed" })
                  }
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    lineHeight: 1,
                    padding: 2,
                  }}
                  title="Отклонить"
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}
              >
                {rec.title}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  marginBottom: 7,
                }}
              >
                {rec.description}
              </div>
              {rec.action_type && (
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() =>
                      updateRec.mutate({ id: rec.id, status: "applied" })
                    }
                    style={{
                      padding: "3px 9px",
                      background: "var(--primary)",
                      color: "var(--on-primary)",
                      border: "none",
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Применить
                  </button>
                  <button
                    style={{
                      padding: "3px 8px",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "0.5px solid var(--border)",
                      borderRadius: 5,
                      fontSize: 10,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Подробнее
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Auto Rules */}
        <div
          style={{
            borderTop: "0.5px solid var(--border)",
            margin: "10px 0 9px",
          }}
        />
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 8,
            padding: "0 3px",
          }}
        >
          Автоправила · {rules.length}
        </div>

        {rulesLoading && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              padding: "8px 4px",
            }}
          >
            Загрузка...
          </div>
        )}

        {!rulesLoading && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "0.5px solid var(--border)",
              borderRadius: 9,
              padding: "6px 10px",
              marginBottom: 7,
            }}
          >
            {rules.length === 0 && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  padding: "4px 0",
                }}
              >
                Нет правил
              </div>
            )}
            {rules.map((rule, i) => (
              <div
                key={rule.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 0",
                  borderBottom:
                    i < rules.length - 1 ? "0.5px solid var(--border)" : "none",
                }}
              >
                <Toggle
                  defaultOn={rule.is_active}
                  onChange={(on) =>
                    toggleRule.mutate({ id: rule.id, is_active: on })
                  }
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 10,
                    color: rule.is_active
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rule.name}
                </span>
                <button
                  onClick={() => deleteRule.mutate(rule.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    lineHeight: 1,
                    padding: 2,
                    flexShrink: 0,
                  }}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          style={{ width: "100%", justifyContent: "center", fontSize: 10 }}
          onClick={() => setRuleModal(true)}
        >
          + Добавить правило
        </Button>
      </div>

      <Modal
        open={ruleModal}
        onClose={() => setRuleModal(false)}
        title="Новое автоправило"
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
              Название
            </label>
            <input
              type="text"
              placeholder="Например: Пауза при низком CTR"
              value={newRule.name}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, name: e.target.value }))
              }
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}
              >
                Метрика
              </label>
              <select
                value={newRule.condition_field}
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, condition_field: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="ctr">CTR</option>
                <option value="cpl">CPL</option>
                <option value="roas">ROAS</option>
                <option value="budget_spent">Расход</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}
              >
                Условие
              </label>
              <select
                value={newRule.condition_op}
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, condition_op: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="lt">&lt;</option>
                <option value="gt">&gt;</option>
                <option value="lte">≤</option>
                <option value="gte">≥</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}
              >
                Значение
              </label>
              <input
                type="number"
                value={newRule.condition_value}
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, condition_value: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              Действие
            </label>
            <select
              value={newRule.action_type}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, action_type: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "7px 9px",
                fontSize: 11,
                fontFamily: "inherit",
                border: "0.5px solid var(--border)",
                borderRadius: 7,
                background: "var(--bg)",
                color: "var(--text-primary)",
              }}
            >
              <option value="pause">Поставить на паузу</option>
              <option value="stop">Остановить</option>
              <option value="increase_budget">Увеличить бюджет</option>
              <option value="decrease_budget">Уменьшить бюджет</option>
              <option value="notify">Уведомить</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setRuleModal(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={addRule}
              style={{ opacity: createRule.isPending ? 0.7 : 1 }}
            >
              {createRule.isPending ? "Сохранение..." : "Создать правило"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
