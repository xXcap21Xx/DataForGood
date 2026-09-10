import TopBar from "@/components/layout/TopBar";
import SidebarNav from "@/components/layout/SidebarNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <div className="dashboard-shell flex">
        <SidebarNav />
        <main className="min-w-0 flex-1">
          <div className="dashboard-content mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
