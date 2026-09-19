import type { Metadata } from "next";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-16">
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Aviso de privacidad</h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
          El aviso de privacidad todavía no está redactado ni aprobado por el equipo. Esta
          página se actualizará en cuanto esté listo.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
