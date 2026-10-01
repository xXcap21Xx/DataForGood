import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/session";

export default async function SupervisionLayout({ children }: { children: React.ReactNode }) {
  const user = await exigirUsuario();
  if (!user.role.includes("supervisor")) {
    redirect("/campanas");
  }

  return children;
}
