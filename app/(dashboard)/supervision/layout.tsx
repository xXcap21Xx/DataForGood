import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function SupervisionLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const isSupervisor = user?.role.includes("supervisor") ?? false;
  const isReviewer = user?.role.includes("revisor") ?? false;

  if (!isSupervisor || isReviewer) {
    redirect("/campanas");
  }

  return children;
}
