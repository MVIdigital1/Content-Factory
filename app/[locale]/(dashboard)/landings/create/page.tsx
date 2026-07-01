"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Sparkles, Lock, Check, ExternalLink, Edit3 } from "lucide-react";

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
};

const NICHES = [
  "недвижимость","медицина","образование","услуги","товары",
  "IT / технологии","красота и уход","строительство","питание","другое",
];

const TONES = ["профессиональный", "дружелюбный", "молодёжный", "экспертный", "вдохновляющий"];

const TEMPLATES = [
  { id: "classic",    name: "Классический",     desc: "Одноколоночный лаконичный дизайн",  pro: false, preview: "🗂️" },
  { id: "hero-form",  name: "Hero + форма",      desc: "Текст слева, форма справа",          pro: false, preview: "📄" },
  { id: "minimal",    name: "Минималистичный",   desc: "Чистый белый с акцентами",           pro: false, preview: "⬜" },
  { id: "big-photo",  name: "Большое фото",      desc: "Полноэкранное изображение фона",     pro: false, preview: "🖼️" },
  { id: "video-bg",   name: "Видео фон",         desc: "Динамичный видеофон",                pro: true,  preview: "🎬" },
  { id: "fullscreen", name: "Полноэкранный",     desc: "Секции на весь экран",              pro: true,  preview: "⬛" },
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

  const [step, setStep] = useState(1);
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

  const set1 = (field: keyof Step1) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setStep1((p) => ({ ...p, [field]: e.target.value }));

  const canNext1 = step1.businessName && step1.offer && step1.audience;

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
    } catch (e: any) {
      setError(e.message);
      setGenerating(false);
    }
  };

  const STEPS = ["Бизнес", "Шаблон", "Фон"];

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
                <a href={`/l/${created.slug}`} target="_blank" rel="noreferrer"
                  style={{ color: "var(--accent)", fontWeight: 600 }}>
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
                href={`/l/${created.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
              >
                <ExternalLink size={14} /> Открыть
              </a>
            </div>
          </div>

          {/* Preview iframe */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "8px 16px", background: "var(--panel-2)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
              </div>
              <div style={{ flex: 1, background: "var(--bg)", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "var(--tx-3)" }}>
                mvira.uz/l/{created.slug}
              </div>
            </div>
            <iframe
              src={`/l/${created.slug}`}
              style={{ width: "100%", height: 560, border: "none", display: "block" }}
              title="Предпросмотр лендинга"
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push(`/${locale}/landings`)}
              style={{ padding: "10px 20px", border: "1px solid var(--line)", borderRadius: 9, background: "transparent", color: "var(--tx-2)", fontSize: 13, cursor: "pointer" }}
            >
              ← Все лендинги
            </button>
            <button
              onClick={() => {
                setCreated(null);
                setStep(1);
                setStep1(EMPTY_STEP1);
                setTemplateId("classic");
                setBgImage(BG_IMAGES[0].url);
              }}
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
          onClick={() => fromCampaign ? router.back() : router.push(`/${locale}/landings`)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--tx-3)", fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0 }}
        >
          <ChevronLeft size={16} />
          Все лендинги
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--tx-1)", marginBottom: 8 }}>
          Создать лендинг
        </h1>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 36, alignItems: "center" }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", flex: n < STEPS.length ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: done || active ? "var(--accent)" : "var(--chip)", color: done || active ? "var(--on-accent)" : "var(--tx-3)", flexShrink: 0 }}>
                    {done ? <Check size={13} /> : n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--tx-1)" : "var(--tx-3)", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {n < STEPS.length && (
                  <div style={{ flex: 1, height: 1, background: done ? "var(--accent)" : "var(--line)", margin: "0 12px" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1 — Business info ─────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Название бизнеса *">
                <input value={step1.businessName} onChange={set1("businessName")} placeholder="напр. Клиника Здоровье" style={inputStyle} />
              </Field>
              <Field label="Ниша / категория *">
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
              <textarea value={step1.pain} onChange={set1("pain")} placeholder="напр. Страх боли и дорогого лечения" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Три преимущества (через запятую)">
              <textarea value={step1.advantages} onChange={set1("advantages")} placeholder="напр. Современное оборудование, Без боли, Гарантия 2 года" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Тон общения">
              <select value={step1.tone} onChange={set1("tone")} style={inputStyle}>
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
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
              Выберите структуру лендинга. Позже вы сможете изменить любой блок.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
              {TEMPLATES.map((tpl) => {
                const selected = templateId === tpl.id;
                return (
                  <div key={tpl.id} onClick={() => !tpl.pro && setTemplateId(tpl.id)}
                    style={{ position: "relative", border: selected ? "2px solid var(--accent)" : "1px solid var(--line)", borderRadius: 12, overflow: "hidden", cursor: tpl.pro ? "default" : "pointer", opacity: tpl.pro ? 0.6 : 1, background: "var(--panel)", transition: "border 0.15s" }}
                  >
                    <div style={{ height: 100, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={backBtnStyle}><ChevronLeft size={16} /> Назад</button>
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
                  <div key={img.id} onClick={() => !img.pro && setBgImage(img.url)}
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
              <button onClick={() => setStep(2)} style={backBtnStyle}><ChevronLeft size={16} /> Назад</button>
              <button onClick={handleGenerate} disabled={generating}
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
