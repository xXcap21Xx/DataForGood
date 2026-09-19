import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-line px-6 py-8 text-center text-[12.5px] text-ink-3">
      <p>© {new Date().getFullYear()} DataForGood — Plataforma de crowdsourcing de datos.</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        <Link href="/sobre-nosotros" className="hover:text-ink">
          Sobre nosotros
        </Link>
        <Link href="/privacidad" className="hover:text-ink">
          Privacidad
        </Link>
        <Link href="/contacto" className="hover:text-ink">
          Contacto
        </Link>
      </div>
    </footer>
  );
}
