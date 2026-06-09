import Sidebar from "@/components/features/Sidebar";
import { TopNavbar } from "@/components/features/TopNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col gap-2 md:pt-2 md:pr-2 md:pb-2 md:pl-2">
        {/* Rounded top navbar - separate from content */}
        <TopNavbar />
        {/* Main content - also rounded */}
        <div className="flex-1 bg-panel border border-line rounded-2xl overflow-y-auto md:pt-0 pt-14 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
