import { Metadata } from "next";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import Link from "next/link";
import { Globe, ExternalLink } from "lucide-react";

type Props = { params: Promise<{ userId: string }> };

type Landing = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
};

type UserRow = { full_name: string | null };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await queryOne<UserRow>(
    "SELECT full_name FROM users WHERE id = $1",
    [userId]
  );
  const name = user?.full_name || "Компания";
  return { title: `Лендинги — ${name}` };
}

export default async function PortfolioPage({ params }: Props) {
  const { userId } = await params;

  const [user, landings] = await Promise.all([
    queryOne<UserRow>("SELECT full_name FROM users WHERE id = $1", [userId]),
    query<Landing>(
      `SELECT id, title, slug, created_at
       FROM landings
       WHERE user_id = $1 AND published = true
       ORDER BY created_at DESC`,
      [userId]
    ),
  ]);

  if (!landings || landings.length === 0) notFound();

  const displayName = user?.full_name || "Портфолио";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "0 0 80px" }}>
      {/* Header */}
      <header style={{ padding: "40px 24px 32px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", marginBottom: 14 }}>
          <Globe size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{displayName}</h1>
        <p style={{ fontSize: 15, color: "#94a3b8", margin: "8px 0 0" }}>
          {landings.length} опубликован{landings.length === 1 ? "ный лендинг" : landings.length < 5 ? "ных лендинга" : "ных лендингов"}
        </p>
      </header>

      {/* Grid */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {landings.map((l) => (
            <Link
              key={l.id}
              href={`/l/${l.slug}`}
              style={{ display: "block", textDecoration: "none", borderRadius: 16, overflow: "hidden", background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(99,102,241,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              {/* Preview thumbnail */}
              <div style={{ height: 140, background: "linear-gradient(135deg, #1e293b 0%, #312e81 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Globe size={36} color="rgba(139,92,246,0.6)" />
              </div>

              <div style={{ padding: "14px 16px 16px" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.title}
                </h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{formatDate(l.created_at)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#818cf8", fontWeight: 500 }}>
                    Открыть <ExternalLink size={11} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "0 24px", color: "#475569", fontSize: 12 }}>
        Создано с MVI Content Factory
      </footer>
    </div>
  );
}
