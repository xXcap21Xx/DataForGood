import Link from "next/link";
import Button from "@/components/ui/Button";

export default function PublicHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <Link href="/" className="flex items-center gap-2 font-extrabold text-ink">
        <span className="h-6 w-6 rounded-md bg-accent" aria-hidden />
        DataForGood
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-ink-2 md:flex">
        <Link href="/#como-funciona" className="hover:text-ink">
          Cómo funciona
        </Link>
        <Link href="/campanas" className="hover:text-ink">
          Campañas
        </Link>
        <Link href="/entrar" className="hover:text-ink">
          Iniciar sesión
        </Link>
      </nav>
      <Button variant="primary" size="sm">
        <Link href="/registro">Crear campaña</Link>
      </Button>
    </header>
  );
}
