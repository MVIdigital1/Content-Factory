"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Sparkles, Lock, Check, ExternalLink, Edit3, Building2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Step1 = {
  businessName: string;
  niche: string;
  city: string;
  offer: string;
  audience: string;
  pain: string;
  advantages: string;
  tone: string;
  brandColor: string;
  oldPrice: string;
  newPrice: string;
  productEmoji: string;
};

type Project = {
  id: string;
  name: string;
  niche: string | null;
  logo_url: string | null;
};

const EMPTY_STEP1: Step1 = {
  businessName: "",
  niche: "услуги",
  city: "",
  offer: "",
  audience: "",
  pain: "",
  advantages: "",
  tone: "профессиональный",
  brandColor: "#6366f1",
  oldPrice: "",
  newPrice: "",
  productEmoji: "",
};

const NICHES = [
  "недвижимость", "медицина", "образование", "услуги", "товары",
  "IT / технологии", "красота и уход", "строительство", "питание", "другое",
];

const TONES = ["профессиональный", "дружелюбный", "молодёжный", "экспертный", "вдохновляющий"];

const TEMPLATES = [
  { id: "product",     name: "Товар",    desc: "Продажа товара со скидкой и ценой",   pro: false, preview: "🛒" },
  { id: "form",        name: "Заявка",   desc: "Форма сбора лидов для услуг",         pro: false, preview: "📋" },
  { id: "appointment", name: "Запись",   desc: "Запись на консультацию или приём",    pro: false, preview: "📅" },
  { id: "event",       name: "Событие",  desc: "Мероприятие, вебинар или тренинг",   pro: false, preview: "🎉" },
  { id: "menu",        name: "Меню",     desc: "Каталог блюд, услуг или позиций",    pro: false, preview: "🍽️" },
  { id: "callback",    name: "Звонок",   desc: "Обратный звонок — AI перезвонит",    pro: false, preview: "📞" },
];

const BG_IMAGES = [
  { id: "abstract1", url: "https://picsum.photos/seed/land1/800/500", pro: false },
  { id: "abstract2", url: "https://picsum.photos/seed/land2/800/500", pro: false },
  { id: "abstract3", url: "https://picsum.photos/seed/land3/800/500", pro: false },
  { id: "abstract4", url: "https://picsum.photos/seed/land4/800/500", pro: false },
  { id: "abstract5", url: "https://picsum.photos/seed/land5/800/500", pro: false },
  { id: "abstract6", url: "https://picsum.photos/seed/land6/800/500", pro: false },
  { id: "pro1",      url: "https://picsum.photos/seed/pro1/800/500",  pro: true },
  { id: "pro2",      url: "https://picsum.photos/seed/pro2/800/500",  pro: true },
  { id: "pro3",      url: "https://picsum.photos/seed/pro3/800/500",  pro: true },
];

const STORAGE_KEY = "landing_draft_v1";

// ── Component ──────────────────────────────────────────────────────────────
function CreateLandingPageInner() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const fromCampaign = searchParams.get("from") === "campaign";

  // step 0 = project selection, 1 = business details, 2 = template, 3 = background
  const [step, setStep] = useState(0);
  const [step1, setStep1] = useState<Step1>(() => {
    const offer = searchParams.get("product") || "";
    const audience = searchParams.get("audience") || "";
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        return { ...d, ...(offer ? { offer } : {}), ...(audience ? { audience } : {}) };
      }
    } catch {}
    return { ...EMPTY_STEP1, offer, audience };
  });
  const [templateId, setTemplateId] = useState<string>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY + "_tpl") || "classic"; } catch { return "classic"; }
  });
  const [bgImage, setBgImage] = useState<string>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY + "_bg") || BG_IMAGES[0].url; } catch { return BG_IMAGES[0].url; }
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);

  // Project selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [fillingFromProject, setFillingFromProject] = useState(false);
  const [filledFromProject, setFilledFromProject] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(step1)); } catch {}
  }, [step1]);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY + "_tpl", templateId); } catch {}
  }, [templateId]);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY + "_bg", bgImage); } catch {}
  }, [bgImage]);

  const set1 = (field: keyof Step1) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setStep1((p) => ({ ...p, [field]: e.target.value }));

  const canNext1 = step1.businessName && step1.offer && step1.audience;

  const handleSelectProject = async (projectId: string) => {
    setFillingFromProject(true);
    try {
      const res = await fetch("/api/landings/from-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setStep1((prev) => ({
        ...prev,
        businessName: data.businessName || prev.businessName,
        niche: data.niche || prev.niche,
        city: data.city || prev.city,
        offer: data.offer || prev.offer,
        audience: data.audience || prev.audience,
        pain: data.pain || prev.pain,
        advantages: data.advantages || prev.advantages,
        tone: data.tone || prev.tone,
      }));
      const proj = projects.find((p) => p.id === projectId);
      setFilledFromProject(proj?.name ?? null);
    } catch {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        setStep1((prev) => ({ ...prev, businessName: proj.name }));
        setFilledFromProject(proj.name);
      }
    } finally {
      setFillingFromProject(false);
      setStep(1);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/landings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...step1, templateId, bgImage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Ошибка генерации");
      }
      const { id, slug } = await res.json();
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY + "_tpl");
        sessionStorage.removeItem(STORAGE_KEY + "_bg");
      } catch {}
      setCreated({ id, slug });
      // redirect to list after short delay so user sees the success screen
      setTimeout(() => router.push(`/${locale}/landings`), 4000);
    } catch (e: any) {
      setError(e.message);
      setGenerating(false);
    }
  };

  const goBack = () => {
    if (step === 0) {
      fromCampaign ? router.back() : router.push(`/${locale}/landings`);
    } else {
      setStep((s) => s - 1);
    }
  };

  const STEPS = ["Проект", "Детали", "Шаблон", "Фон"];

  // ── Success screen ─────────────────────────────────────────────────────
  if (created) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px 64px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, padding: "16px 20px", background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>Лендинг создан!</p>
              <p style={{ fontSize: 13, color: "var(--tx-3)", margin: "2px 0 0" }}>
                Страница доступна по адресу{" "}
                <a href={`/l/${created.slug}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  /l/{created.slug}
                </a>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => router.push(`/${locale}/landings/${created.id}/edit`)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "1px solid var(--line)", borderRadius: 9, background: "var(--panel)", color: "var(--tx-1)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                <Edit3 size={14} /> Редактировать
              </button>
              <a
                href={`/l/${created.slug}`} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
              >
                <ExternalLink size={14} /> Открыть
              </a>
            </div>
          </div>

          <div style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "8px 16px", background: "var(--panel-2)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                ))}
              </div>
              <div style={{ flex: 1, background: "var(--bg)", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "var(--tx-3)" }}>
                mvira.uz/l/{created.slug}
              </div>
            </div>
            <iframe src={`/l/${created.slug}`} style={{ width: "100%", height: 560, border: "none", display: "block" }} title="Предпросмотр лендинга" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push(`/${locale}/landings`)}
              style={{ padding: "10px 20px", border: "1px solid var(--line)", borderRadius: 9, background: "transparent", color: "var(--tx-2)", fontSize: 13, cursor: "pointer" }}
            >
              ← Все лендинги
            </button>
            <button
              onClick={() => { setCreated(null); setStep(0); setStep1(EMPTY_STEP1); setTemplateId("classic"); setBgImage(BG_IMAGES[0].url); setFilledFromProject(null); setSelectedProjectId(null); }}
              style={{ padding: "10px 20px", border: "1px solid var(--line)", borderRadius: 9, background: "var(--panel)", color: "var(--tx-1)", fontSize: 13, cursor: "pointer" }}
            >
              + Создать ещё
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px 64px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={goBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--tx-3)", fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0 }}
        >
          <ChevronLeft size={16} />
          {step === 0 ? "Все лендинги" : "Назад"}
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--tx-1)", marginBottom: 8 }}>Создать лендинг</h1>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 36, alignItems: "center" }}>
          {STEPS.map((label, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: done || active ? "var(--accent)" : "var(--chip)", color: done || active ? "var(--on-accent)" : "var(--tx-3)", flexShrink: 0 }}>
                    {done ? <Check size={13} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--tx-1)" : "var(--tx-3)", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: done ? "var(--accent)" : "var(--line)", margin: "0 12px" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 0 — Project selection ─────────────────────────────── */}
        {step === 0 && (
          <div>
            <p style={{ fontSize: 14, color: "var(--tx-2)", marginBottom: 24 }}>
              Выберите проект — AI автоматически адаптирует данные для лендинга. Или заполните вручную.
            </p>

            {projectsLoading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--tx-3)", fontSize: 14 }}>
                Загрузка проектов...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Building2 size={24} color="var(--tx-3)" />
                </div>
                <p style={{ color: "var(--tx-2)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Нет проектов</p>
                <p style={{ color: "var(--tx-3)", fontSize: 13, marginBottom: 20 }}>Создайте проект или заполните данные вручную</p>
                <button onClick={() => setStep(1)} style={nextBtnStyle(false)}>
                  Заполнить вручную <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12, marginBottom: 28 }}>
                  {projects.map((p) => {
                    const selected = selectedProjectId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(selected ? null : p.id)}
                        style={{
                          border: selected ? "2px solid var(--accent)" : "1px solid var(--line)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          cursor: "pointer",
                          background: selected ? "color-mix(in srgb, var(--accent) 8%, var(--panel))" : "var(--panel)",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {p.logo_url ? (
                          <img src={p.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Building2 size={20} color="var(--tx-3)" />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </div>
                          {p.niche && (
                            <div style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 2 }}>{p.niche}</div>
                          )}
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: selected ? "none" : "2px solid var(--line)", background: selected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                          {selected && <Check size={11} color="white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(1)} style={backBtnStyle}>
                    Без проекта
                  </button>
                  <button
                    onClick={() => selectedProjectId && handleSelectProject(selectedProjectId)}
                    disabled={!selectedProjectId || fillingFromProject}
                    style={nextBtnStyle(!selectedProjectId || fillingFromProject)}
                  >
                    {fillingFromProject ? (
                      <><Sparkles size={15} style={{ animation: "spin 1s linear infinite" }} /> AI заполняет поля...</>
                    ) : (
                      <>Использовать проект <ChevronRight size={16} /></>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 1 — Business info ─────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {filledFromProject && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "color-mix(in srgb, var(--accent) 8%, var(--panel))", border: "1px solid color-mix(in srgb, var(--accent) 25%, var(--line))", borderRadius: 10, fontSize: 13, color: "var(--tx-2)" }}>
                <Sparkles size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span>AI заполнил поля по проекту <strong style={{ color: "var(--tx-1)" }}>«{filledFromProject}»</strong>. Проверьте и при необходимости отредактируйте.</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Название бизнеса *">
                <input value={step1.businessName} onChange={set1("businessName")} placeholder="напр. Клиника Здоровье" style={inputStyle} />
              </Field>
              <Field label="Ниша / категория">
                <select value={step1.niche} onChange={set1("niche")} style={inputStyle}>
                  {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Город и страна">
                <input value={step1.city} onChange={set1("city")} placeholder="напр. Ташкент, Узбекистан" style={inputStyle} />
              </Field>
              <Field label="Цвет бренда">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={step1.brandColor} onChange={set1("brandColor")} style={{ width: 40, height: 36, border: "1px solid var(--line)", borderRadius: 8, padding: 2, cursor: "pointer", background: "var(--panel)" }} />
                  <input value={step1.brandColor} onChange={set1("brandColor")} placeholder="#6366f1" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </Field>
            </div>

            <Field label="Главный оффер — что предлагаете *">
              <textarea value={step1.offer} onChange={set1("offer")} placeholder="напр. Лечение зубов без боли за 1 визит" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Целевая аудитория *">
              <textarea value={step1.audience} onChange={set1("audience")} placeholder="напр. Взрослые 25–55 лет, боящиеся стоматологов" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Главная боль клиента">
              <textarea value={step1.pain} onChange={set1("pain")} placeholder="напр. Страх боли и высокой стоимости лечения" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Три преимущества (через запятую)">
              <textarea value={step1.advantages} onChange={set1("advantages")} placeholder="напр. Современное оборудование, Без боли, Гарантия 2 года" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Тон общения">
              <select value={step1.tone} onChange={set1("tone")} style={inputStyle}>
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button onClick={goBack} style={backBtnStyle}><ChevronLeft size={16} /> Назад</button>
              <button onClick={() => setStep(2)} disabled={!canNext1} style={nextBtnStyle(!canNext1)}>
                Далее <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 — Template ──────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: "var(--tx-2)", marginBottom: 24 }}>
              Выберите тип лендинга — AI сгенерирует подходящую структуру.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              {TEMPLATES.map((tpl) => {
                const selected = templateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => !tpl.pro && setTemplateId(tpl.id)}
                    style={{ position: "relative", border: selected ? "2px solid var(--accent)" : "1px solid var(--line)", borderRadius: 12, overflow: "hidden", cursor: tpl.pro ? "default" : "pointer", opacity: tpl.pro ? 0.6 : 1, background: "var(--panel)", transition: "border 0.15s" }}
                  >
                    <div style={{ height: 100, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, position: "relative" }}>
                      {tpl.preview}
                      {tpl.pro && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Lock size={20} color="#fff" />
                        </div>
                      )}
                      {selected && (
                        <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={11} color="white" />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)" }}>{tpl.name}</span>
                        {tpl.pro && <span style={{ fontSize: 9, fontWeight: 700, background: "#fbbf24", color: "#78350f", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>Pro</span>}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>{tpl.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price fields — shown only for product template */}
            {templateId === "product" && (
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 20px", marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", marginBottom: 14 }}>🏷️ Цена товара</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Старая цена (перечёркнутая)">
                    <input value={step1.oldPrice} onChange={set1("oldPrice")} placeholder="напр. 150 000 сум" style={inputStyle} />
                  </Field>
                  <Field label="Новая цена (зелёная)">
                    <input value={step1.newPrice} onChange={set1("newPrice")} placeholder="напр. 99 000 сум" style={inputStyle} />
                  </Field>
                  <Field label="Эмодзи товара">
                    <input value={step1.productEmoji} onChange={set1("productEmoji")} placeholder="напр. 🛍️" style={inputStyle} />
                  </Field>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={goBack} style={backBtnStyle}><ChevronLeft size={16} /> Назад</button>
              <button onClick={() => setStep(3)} style={nextBtnStyle(false)}>Далее <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Background ───────────────────────────────────── */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: "var(--tx-2)", marginBottom: 20 }}>
              Выберите фоновое изображение
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              {BG_IMAGES.map((img) => {
                const selected = bgImage === img.url;
                return (
                  <div
                    key={img.id}
                    onClick={() => !img.pro && setBgImage(img.url)}
                    style={{ position: "relative", height: 100, borderRadius: 10, overflow: "hidden", cursor: img.pro ? "default" : "pointer", border: selected ? "2px solid var(--accent)" : "2px solid transparent", transition: "border 0.15s" }}
                  >
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {img.pro && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                        <Lock size={16} color="#fff" />
                        <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>PRO</span>
                      </div>
                    )}
                    {selected && (
                      <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={11} color="white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", marginBottom: 8 }}>✦ Описать фон для AI</p>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="напр. Современный офис с большими окнами, теплые тона" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              <p style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 6 }}>Генерация фонов через AI будет доступна скоро</p>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={goBack} style={backBtnStyle}><ChevronLeft size={16} /> Назад</button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--accent)", color: "var(--on-accent)", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1 }}
              >
                <Sparkles size={16} />
                {generating ? "Создаём с AI..." : "Создать с AI"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateLandingPage() {
  return (
    <Suspense fallback={null}>
      <CreateLandingPageInner />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-2)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--tx-1)",
  outline: "none",
  boxSizing: "border-box",
};

const nextBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--accent)",
  color: "var(--on-accent)",
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

const backBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--chip)",
  color: "var(--tx-2)",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
