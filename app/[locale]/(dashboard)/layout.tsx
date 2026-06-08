import Sidebar from "@/components/features/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden md:pt-1.5 md:pr-1.5 md:pb-3 md:pl-2">
        <div className="h-full bg-panel border border-line rounded-2xl overflow-y-auto md:pt-0 pt-14">
          {children}
        </div>
      </main>
    </div>
  );
}
