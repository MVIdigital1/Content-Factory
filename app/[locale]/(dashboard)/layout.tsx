import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <Sidebar />
      <main style={{ flex: 1, overflow: "hidden", padding: "6px 6px 6px 0" }}>
        <div
          style={{
            height: "100%",
            background: "var(--bg-card)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
