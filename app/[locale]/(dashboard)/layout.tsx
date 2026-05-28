import Sidebar from "@/components/features/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#F4F6F8] overflow-hidden">
      <Sidebar />
      <main className="flex-1 pt-1.5 pr-1.5 pb-3 pl-2 overflow-hidden">
        <div
          className="h-full bg-white rounded-2xl overflow-y-auto md:pt-0 pt-14"
          style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
