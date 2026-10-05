// Encabezado de las pantallas públicas (landing, /explorar, /datos...).

import Link from "next/link";
import ButtonLink from "@/components/ui/ButtonLink";
import Logo from "@/components/layout/Logo";

export default function PublicHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <Link href="/" className="flex items-center">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-ink-2 md:flex">
        <Link href="/#como-funciona" className="hover:text-ink">
          Cómo funciona
        </Link>
        <Link href="/explorar" className="hover:text-ink">
          Campañas
        </Link>
        <Link href="/datos" className="hover:text-ink">
          Datos abiertos
        </Link>
        <Link href="/entrar" className="hover:text-ink">
          Iniciar sesión
        </Link>
      </nav>
      <ButtonLink href="/registro" variant="primary" size="sm">
        Crear campaña
      </ButtonLink>
    </header>
  );
}
