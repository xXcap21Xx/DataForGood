import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sistema/Sidebar";
import Topbar from "@/components/sistema/Topbar";
import { hasRootSession } from "@/lib/rootSession";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · DataForGood" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const sesionValida = await hasRootSession();

  if (!sesionValida) {
    redirect("/root");
  }

  return (
    <div className="min-h-screen bg-paper">
      <Topbar identificador={process.env.ROOT_USER_ID ?? "raíz"} />
      <div className="dashboard-shell flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
