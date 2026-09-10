import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

const SAMPLE_POSTS = [
  { tag: "#reforestacion", time: "14:02", status: "Aprobado" as const },
  { tag: "#baches", time: "09:15", status: "Pendiente" as const },
  {
    tag: "#fauna-urbana",
    time: "11:47",
    status: "Aprobado" as const,
    quote: '"Gato callejero visto cerca del parque, aparenta estar sano."',
  },
  { tag: "#reciclaje", time: "18:40", status: "Aprobado" as const },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <p className="mb-4 font-mono text-[10.5px] uppercase tracking-widest text-accent">
          Plataforma de crowdsourcing de datos
        </p>
        <h1 className="mx-auto max-w-2xl text-[46px] font-extrabold leading-[1.08] tracking-tight text-ink">
          Cada dato cuenta, cuando lo cuenta la comunidad
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-2">
          DataForGood conecta organizaciones con personas dispuestas a aportar
          información en campo —fotos, audio o texto— para causas sociales,
          ambientales y comunitarias.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link href="/registro">
            <Button variant="primary">Crear una campaña</Button>
          </Link>
          <Link href="/campanas">
            <Button variant="secondary">Explorar campañas</Button>
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SAMPLE_POSTS.map((post, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-lg border border-line bg-surface p-4 text-left"
              style={{ minHeight: 140 }}
            >
              {"quote" in post && post.quote ? (
                <p className="text-[13px] leading-snug text-ink">{post.quote}</p>
              ) : (
                <div className="h-16 rounded bg-gradient-to-b from-accent-tint to-accent/20" />
              )}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-accent">{post.tag}</p>
                  <p className="font-mono text-[11px] text-ink-3">{post.time}</p>
                </div>
                <Tag tone={post.status === "Aprobado" ? "ok" : "warn"}>
                  {post.status}
                </Tag>
              </div>
            </div>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
