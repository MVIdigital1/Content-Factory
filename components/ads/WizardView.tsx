"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { PLATFORM_META } from "./data";
import {
  useCreateAdCampaign,
  useCreateAdCreative,
} from "@/lib/hooks/useAdsData";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";

// 4 steps: Goal → Platforms → Creatives → Launch
const STEPS = ["Цель", "Платформы", "Креативы", "Запуск"];

const PLATFORMS_LIST = [
  {
    key: "telegram",
    channels: [
      "@pyaty_element · 12 400 подп.",
      "@pyaty_element_uz · 4 200 (узб.)",
    ],
    defaultSelected: [0],
  },
  {
    key: "instagram",
    channels: ["@pyaty_element.uz · 8 240 подп."],
    defaultSelected: [0],
  },
  {
    key: "yandex",
    channels: ["MVI Digital — Основной", "Пятый элемент UZ"],
    defaultSelected: [0],
  },
  { key: "vk", channels: ["MVI Digital · 3 кабинета"], defaultSelected: [] },
  { key: "google", channels: ["MVI Digital · 1 кабинет"], defaultSelected: [] },
  {
    key: "meta",
    channels: ["MVI Digital · Meta Business"],
    defaultSelected: [],
  },
];

const CREATIVE_VARIANTS = [
  {
    emoji: "🌙",
    title: "«Праздничный оффер»",
    desc: "Акцент на скидке и дедлайне",
  },
  { emoji: "✨", title: "«Качество + цена»", desc: "Преимущества продукта" },
  { emoji: "🎁", title: "«UGC-стиль»", desc: "Отзыв от лица покупателя" },
  { emoji: "🏠", title: "«Польза / лайфхак»", desc: "Проблема → решение" },
  { emoji: "⭐", title: "«Прямой CTA»", desc: "Короткий и конкретный призыв" },
];

export function WizardView({
  onClose,
  projectId,
}: {
  onClose?: () => void;
  projectId?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const createCampaign = useCreateAdCampaign();
  const createCreative = useCreateAdCreative();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("Продажи / заявки");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set<string>());
  const [expandedPlatforms, setExpandedPlatforms] = useState(new Set<string>());
  const [selectedCreatives, setSelectedCreatives] = useState(new Set<string>());
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
        setExpandedPlatforms((ep) => new Set([...ep, key]));
      }
      return n;
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedPlatforms((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleCreative = (id: string) => {
    setSelectedCreatives((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleLaunch = async () => {
    if (!name.trim()) {
      setError("Введите название кампании");
      return;
    }
    if (selectedPlatforms.size === 0) {
      setError("Выберите хотя бы одну платформу");
      return;
    }
    setLaunching(true);
    setError("");
    try {
      // Save campaign
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
        project_id: projectId,
      });

      // Save selected creatives
      for (const cId of selectedCreatives) {
        const [platformKey, idx] = cId.split("-");
        const variant = CREATIVE_VARIANTS[Number(idx)];
        if (variant) {
          await createCreative.mutateAsync({
            campaign_id: campaign.id,
            project_id: projectId,
            platform: platformKey,
            format: "post",
            title: variant.title,
            caption: variant.desc,
            status: "draft",
            ai_generated: true,
            ctr: 0,
            impressions: 0,
            clicks: 0,
            is_winner: false,
          });
        }
      }

      // Navigate to campaign page
      router.push(`/${locale}/ads/campaigns/${campaign.id}`);
    } catch (e: any) {
      setError(e.message ?? "Ошибка при создании кампании");
    } finally {
      setLaunching(false);
    }
  };

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
    <div>
      {/* Step bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-tertiary)",
          borderRadius: 9,
          padding: "10px 13px",
          marginBottom: 14,
          gap: 3,
        }}
      >
        {STEPS.map((label, i) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            <button
              onClick={() => i < step && setStep(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 20,
                border: "none",
                cursor: i < step ? "pointer" : "default",
                fontFamily: "inherit",
                fontSize: 11,
                fontWeight: 500,
                flexShrink: 0,
                whiteSpace: "nowrap",
                background:
                  step === i
                    ? "var(--primary)"
                    : step > i
                      ? "var(--success-bg)"
                      : "transparent",
                color:
                  step === i
                    ? "var(--on-primary)"
                    : step > i
                      ? "var(--success-text)"
                      : "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  flexShrink: 0,
                  background:
                    step === i
                      ? "rgba(255,255,255,.2)"
                      : step > i
                        ? "var(--success)"
                        : "var(--bg-card)",
                  color:
                    step === i
                      ? "var(--on-primary)"
                      : step > i
                        ? "#fff"
                        : "var(--text-secondary)",
                  border:
                    step <= i && step !== i
                      ? "0.5px solid var(--border)"
                      : "none",
                }}
              >
                {step > i ? "✓" : i + 1}
              </div>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: "var(--danger-bg)",
            border: "0.5px solid var(--danger)",
            borderRadius: 8,
            padding: "9px 13px",
            marginBottom: 12,
            fontSize: 11,
            color: "var(--danger-text)",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Step 0: Goal */}
      {step === 0 && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div>
            <div style={{ marginBottom: 11 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Название кампании *
              </label>
              <input
                style={fi}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Ramadan акция 2026"
              />
            </div>
            <div style={{ marginBottom: 11 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Цель кампании *
              </label>
              <select
                style={fi}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              >
                <option>Продажи / заявки</option>
                <option>Трафик на сайт</option>
                <option>Охват</option>
                <option>Подписчики</option>
              </select>
            </div>
            <div style={{ marginBottom: 11 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                О продукте — для AI *
              </label>
              <textarea
                style={{ ...fi, height: 70, resize: "none" }}
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Опишите продукт, преимущества, акции..."
              />
            </div>
            <div style={{ marginBottom: 11 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Целевая аудитория
              </label>
              <textarea
                style={{ ...fi, height: 56, resize: "none" }}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Возраст, интересы, гео..."
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
                Бюджет (₽)
              </label>
              <input
                style={fi}
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Например: 150000"
              />
            </div>
          </div>
          <div>
            <div
              style={{
                border: "1.5px dashed var(--border-strong)",
                borderRadius: 9,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                background: "var(--bg-card)",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 7 }}>📸</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 3 }}>
                Загрузите фото продукта
              </div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                AI создаст все форматы креативов
              </div>
            </div>
            <div
              style={{
                background: "var(--purple-bg)",
                borderRadius: 9,
                padding: "11px 13px",
                display: "flex",
                gap: 9,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  color: "var(--purple-text)",
                  flexShrink: 0,
                }}
              >
                ✦
              </span>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--purple-text)",
                  lineHeight: 1.5,
                }}
              >
                <strong>AI готов</strong> — на следующих шагах получит контекст
                и сгенерирует 3-5 вариантов на каждую платформу.
              </div>
            </div>
          </div>
          <div
            style={{
              gridColumn: "1/-1",
              display: "flex",
              justifyContent: "flex-end",
              gap: 7,
            }}
          >
            <Button variant="ghost">Сохранить черновик</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!name.trim()) {
                  setError("Введите название");
                  return;
                }
                setError("");
                setStep(1);
              }}
            >
              Далее: Платформы →
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Platforms */}
      {step === 1 && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginBottom: 11,
            }}
          >
            Выберите платформы. При активации откроется список каналов.
          </div>
          {PLATFORMS_LIST.map((pl) => {
            const p = PLATFORM_META[pl.key];
            if (!p) return null;
            const selected = selectedPlatforms.has(pl.key);
            const expanded = expandedPlatforms.has(pl.key);
            return (
              <div
                key={pl.key}
                style={{
                  background: "var(--bg-card)",
                  border: `0.5px solid ${selected ? "var(--success)" : "var(--border)"}`,
                  borderRadius: 9,
                  marginBottom: 7,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                  onClick={() => togglePlatform(pl.key)}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${selected ? "var(--primary)" : "var(--border-strong)"}`,
                      background: selected ? "var(--primary)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--on-primary)",
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {selected && "✓"}
                  </div>
                  <PlatformLogo
                    abbr={p.abbr}
                    color={p.color}
                    textColor={p.textColor}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>
                      {p.name}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "var(--text-secondary)" }}
                    >
                      {pl.channels.length} канала/кабинета
                    </div>
                  </div>
                  {selected && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(pl.key);
                      }}
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: "2px 6px",
                      }}
                    >
                      {expanded ? "▲" : "▼"}
                    </span>
                  )}
                </div>
                {selected && expanded && (
                  <div
                    style={{
                      padding: "0 12px 10px",
                      borderTop: "0.5px solid var(--border)",
                      paddingTop: 10,
                    }}
                  >
                    {pl.channels.map((ch, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "6px 9px",
                          border: `0.5px solid ${pl.defaultSelected.includes(i) ? "var(--success)" : "var(--border)"}`,
                          borderRadius: 6,
                          background: pl.defaultSelected.includes(i)
                            ? "var(--success-bg)"
                            : "var(--bg)",
                          cursor: "pointer",
                          fontSize: 11,
                          marginBottom: 5,
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            border: `1.5px solid ${pl.defaultSelected.includes(i) ? "var(--primary)" : "var(--border-strong)"}`,
                            background: pl.defaultSelected.includes(i)
                              ? "var(--primary)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--on-primary)",
                            fontSize: 9,
                            flexShrink: 0,
                          }}
                        >
                          {pl.defaultSelected.includes(i) && "✓"}
                        </div>
                        {ch}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 14,
            }}
          >
            <Button variant="ghost" onClick={() => setStep(0)}>
              ← Назад
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (selectedPlatforms.size === 0) {
                  setError("Выберите хотя бы одну платформу");
                  return;
                }
                setError("");
                setStep(2);
              }}
            >
              Далее: Креативы →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Creatives */}
      {step === 2 && (
        <div>
          <div
            style={{
              background: "var(--purple-bg)",
              borderRadius: 9,
              padding: 11,
              marginBottom: 13,
              display: "flex",
              alignItems: "center",
              gap: 11,
            }}
          >
            <span
              style={{
                fontSize: 18,
                color: "var(--purple-text)",
                flexShrink: 0,
              }}
            >
              ✦
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--purple-text)",
                  marginBottom: 2,
                }}
              >
                AI генерирует варианты для {selectedPlatforms.size} платформ
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--purple-text)",
                  opacity: 0.8,
                }}
              >
                По 5 вариантов на каждую — выберите лучшие
              </div>
            </div>
          </div>

          {[...selectedPlatforms].map((platformKey) => {
            const p = PLATFORM_META[platformKey];
            if (!p) return null;
            return (
              <div key={platformKey} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 9,
                  }}
                >
                  <PlatformLogo
                    abbr={p.abbr}
                    color={p.color}
                    textColor={p.textColor}
                  />
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginLeft: 4,
                    }}
                  >
                    · выберите варианты
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5,1fr)",
                    gap: 8,
                  }}
                >
                  {CREATIVE_VARIANTS.map((v, i) => {
                    const cId = `${platformKey}-${i}`;
                    const sel = selectedCreatives.has(cId);
                    return (
                      <div
                        key={cId}
                        onClick={() => toggleCreative(cId)}
                        style={{
                          background: sel
                            ? "var(--bg-tertiary)"
                            : "var(--bg-card)",
                          border: `0.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                          borderRadius: 8,
                          padding: 8,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            height: 60,
                            borderRadius: 5,
                            background: `linear-gradient(135deg, ${p.color}, #111)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            marginBottom: 6,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {sel && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,.4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                color: "var(--primary)",
                              }}
                            >
                              ✓
                            </div>
                          )}
                          {v.emoji}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            marginBottom: 2,
                            lineHeight: 1.3,
                          }}
                        >
                          {v.title}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--text-muted)",
                            lineHeight: 1.3,
                          }}
                        >
                          {v.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 14,
            }}
          >
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Назад
            </Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              Далее: Запуск →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Launch */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
            Проверьте и запустите
          </div>
          <div
            style={{
              background: "var(--bg-tertiary)",
              border: "0.5px solid var(--border)",
              borderRadius: 10,
              padding: 13,
              marginBottom: 12,
            }}
          >
            {[
              { l: "Название", v: name },
              { l: "Цель", v: goal },
              {
                l: "Платформы",
                v: [...selectedPlatforms]
                  .map((k) => PLATFORM_META[k]?.name ?? k)
                  .join(", "),
              },
              {
                l: "Бюджет",
                v: budget
                  ? `₽${Number(budget).toLocaleString("ru")}`
                  : "Не указан",
              },
              {
                l: "Выбрано креативов",
                v: `${selectedCreatives.size} вариантов`,
              },
            ].map((row) => (
              <div
                key={row.l}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "7px 0",
                  borderBottom: "0.5px solid var(--border)",
                }}
              >
                <span
                  style={{
                    width: 120,
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {row.l}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{row.v}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              background: "var(--purple-bg)",
              borderRadius: 9,
              padding: "11px 13px",
              marginBottom: 14,
              display: "flex",
              gap: 9,
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: "var(--purple-text)",
                flexShrink: 0,
              }}
            >
              ✦
            </span>
            <div
              style={{
                fontSize: 11,
                color: "var(--purple-text)",
                lineHeight: 1.5,
              }}
            >
              После запуска кампания появится в списке. Зайдите в неё чтобы
              запланировать публикации выбранных креативов.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => setStep(2)}>
              ← Назад
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost">Черновик</Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleLaunch}
                style={{ opacity: launching ? 0.7 : 1 }}
              >
                {launching ? "⟳ Создаю..." : "🚀 Запустить кампанию"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
