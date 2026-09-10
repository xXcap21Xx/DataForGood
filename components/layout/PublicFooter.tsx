export default function PublicFooter() {
  return (
    <footer className="border-t border-line px-6 py-8 text-center text-[12.5px] text-ink-3">
      © {new Date().getFullYear()} DataForGood — Plataforma de crowdsourcing de datos.
    </footer>
  );
}
