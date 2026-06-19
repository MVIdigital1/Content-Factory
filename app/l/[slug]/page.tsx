"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PublicLandingPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("landing_pages")
      .select("*")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .single()
      .then(({ data }) => {
        setPage(data);
        setLoading(false);
        if (data) {
          supabase.from("landing_pages").update({ views: (data.views ?? 0) + 1 }).eq("id", data.id);
        }
      });
  }, [params.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Заполните имя и телефон");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("landing_leads").insert({
      landing_page_id: page.id,
      user_id: page.user_id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      message: form.message.trim() || null,
    });
    if (err) setError("Ошибка отправки. Попробуйте ещё раз.");
    else setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f8" }}>
      <p style={{ color: "#999", fontSize: 14 }}>Загрузка...</p>
    </div>
  );

  if (!page) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f8" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 48 }}>404</p>
        <p style={{ color: "#999", fontSize: 14 }}>Страница не найдена</p>
      </div>
    </div>
  );

  const isDark = page.template === "2";
  const isGrad = page.template === "3";
  const accent = page.color || "#6366f1";
  const bg = isDark ? "#111" : isGrad ? `linear-gradient(135deg, ${accent}22, #fff)` : "#fff";
  const textPrimary = isDark ? "#fff" : "#111";
  const textSecondary = isDark ? "#aaa" : "#666";
  const cardBg = isDark ? "#1e1e1e" : "#f9f9f9";
  const borderColor = isDark ? "#333" : "#e5e5e5";

  const services = page.services
    ? page.services.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Hero */}
      <div style={{ background: isGrad ? `linear-gradient(135deg, ${accent}, ${accent}99)` : isDark ? "#1a1a1a" : accent, padding: "60px 24px 50px", textAlign: "center" }}>
        {page.logo_url && (
          <img src={page.logo_url} alt={page.title} style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", margin: "0 auto 20px", display: "block", background: "#fff" }} />
        )}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.2 }}>{page.title}</h1>
        {page.slogan && <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", margin: 0, fontWeight: 400 }}>{page.slogan}</p>}
        <a href="#contact"
          style={{ display: "inline-block", marginTop: 28, padding: "14px 32px", background: "#fff", color: accent, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
          Оставить заявку →
        </a>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
        {/* About */}
        {page.description && (
          <div style={{ padding: "40px 0 32px", borderBottom: `1px solid ${borderColor}` }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 12 }}>О нас</h2>
            <p style={{ fontSize: 15, color: textSecondary, lineHeight: 1.7, margin: 0 }}>{page.description}</p>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${borderColor}` }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 16 }}>Наши услуги</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {services.map((s: string, i: number) => (
                <div key={i} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: textPrimary, fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact form */}
        <div id="contact" style={{ paddingTop: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>Оставить заявку</h2>
          <p style={{ fontSize: 14, color: textSecondary, marginBottom: 24 }}>Мы свяжемся с вами в ближайшее время</p>

          {submitted ? (
            <div style={{ background: `${accent}15`, border: `1px solid ${accent}40`, borderRadius: 12, padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>✓</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>Заявка отправлена!</p>
              <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>Мы получили вашу заявку и свяжемся с вами</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "name", label: "Ваше имя *", placeholder: "Иван Иванов", type: "text" },
                { key: "phone", label: "Телефон *", placeholder: "+998 90 000 00 00", type: "tel" },
                { key: "email", label: "Email", placeholder: "ivan@mail.ru", type: "email" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: 12, color: textSecondary, marginBottom: 4 }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, color: textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: textSecondary, marginBottom: 4 }}>Сообщение</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Расскажите подробнее о вашем запросе..."
                  rows={3}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, color: textPrimary, fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
              {error && <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={submitting}
                style={{ padding: "14px", background: accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "inherit" }}>
                {submitting ? "Отправка..." : "Отправить заявку"}
              </button>
            </form>
          )}
        </div>

        {/* Contacts */}
        {(page.contact_phone || page.contact_email || page.contact_link) && (
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${borderColor}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {page.contact_phone && <a href={`tel:${page.contact_phone}`} style={{ fontSize: 13, color: accent, textDecoration: "none" }}>📞 {page.contact_phone}</a>}
            {page.contact_email && <a href={`mailto:${page.contact_email}`} style={{ fontSize: 13, color: accent, textDecoration: "none" }}>✉️ {page.contact_email}</a>}
            {page.contact_link && <a href={page.contact_link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: accent, textDecoration: "none" }}>💬 Написать</a>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${borderColor}`, padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: textSecondary, margin: 0 }}>Создано через MVI Content</p>
      </div>
    </div>
  );
}
