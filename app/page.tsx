import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import ButtonLink from "@/components/ui/ButtonLink";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Tag from "@/components/ui/Tag";
import { pool } from "@/lib/db";
import { ensureCoreSchema } from "@/lib/db-schema";
import { DATA_TYPE_LABELS, buscarConjuntosAbiertos, contarConjuntosPublicados } from "@/lib/open-data";

// Página pública: se regenera cada cinco minutos y el resto del tiempo se
// sirve estática, para no golpear la base de datos en cada visita.
export const revalidate = 300;

const nf = new Intl.NumberFormat("es-MX");

const PASOS = [
  {
    numero: "01",
    titulo: "Crea una campaña",
    texto: "Define qué información necesitas, a quién va dirigida y bajo qué reglas de consentimiento.",
  },
  {
    numero: "02",
    titulo: "La comunidad participa",
    texto: "Desde la app, desde el navegador o con un enlace y código QR, sin necesidad de registro.",
  },
  {
    numero: "03",
    titulo: "Recibe y valida los datos",
    texto: "Consulta, aprueba y sigue los resultados en tiempo real desde tu panel.",
  },
];

const COVER_GRADIENTS = [
  "from-accent to-accent/40",
  "from-ok to-ok/40",
  "from-warn to-warn/40",
];

interface CifrasReales {
  campanasCreadas: number;
  participantes: number;
  datosRecolectados: number;
  organizaciones: number;
}

/** Tracción real de la plataforma: sin "+" ni cifras redondeadas, son conteos exactos de la BD. */
async function obtenerCifras(): Promise<CifrasReales> {
  await ensureCoreSchema();
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM campanas) AS campanas_creadas,
      (SELECT COUNT(DISTINCT user_id)::int FROM aportes WHERE user_id IS NOT NULL) AS participantes,
      (SELECT COUNT(*)::int FROM aportes) AS datos_recolectados,
      (SELECT COUNT(DISTINCT creator_id)::int FROM campanas) AS organizaciones
  `);
  const row = result.rows[0] ?? {};
  return {
    campanasCreadas: Number(row.campanas_creadas ?? 0),
    participantes: Number(row.participantes ?? 0),
    datosRecolectados: Number(row.datos_recolectados ?? 0),
    organizaciones: Number(row.organizaciones ?? 0),
  };
}

interface CampanaDestacada {
  id: string;
  name: string;
  tag: string;
  currentContributions: number;
  goalContributions: number;
  participants: number;
}

/** Campañas activas con más participación, para la vitrina de la landing. */
async function obtenerCampanasDestacadas(): Promise<CampanaDestacada[]> {
  await ensureCoreSchema();
  const result = await pool.query(
    `SELECT id, name, COALESCE(NULLIF(tag, ''), tematica) AS tag, current_contributions, goal_contributions, participants
     FROM campanas
     WHERE status = 'activa'
     ORDER BY participants DESC, current_contributions DESC
     LIMIT 3`
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    tag: String(row.tag ?? ""),
    currentContributions: Number(row.current_contributions ?? 0),
    goalContributions: Number(row.goal_contributions ?? 0),
    participants: Number(row.participants ?? 0),
  }));
}

interface AporteReciente {
  id: string;
  tag: string;
  description: string;
  submittedAt: string; // ISO
}

function comoHashtag(texto: string): string {
  const limpio = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `#${limpio || "campana"}`;
}

/**
 * Últimos aportes YA APROBADOS de campañas visibles públicamente (activa,
 * pausada o finalizada). Nunca incluye quién aportó (dominio.md § 9): solo
 * la temática de la campaña, la hora y una parte de la descripción.
 * Deliberadamente no se muestran aportes "pendiente" para no exhibir
 * contenido todavía sin revisar en la página pública.
 */
async function obtenerAportesRecientes(): Promise<AporteReciente[]> {
  await ensureCoreSchema();
  const result = await pool.query(
    `SELECT a.id, COALESCE(NULLIF(c.tag, ''), c.tematica) AS tag, a.description, a.submitted_at
     FROM aportes a
     JOIN campanas c ON c.id = a.campaign_id
     WHERE a.status = 'aceptado' AND c.status IN ('activa', 'pausada', 'finalizada')
     ORDER BY a.submitted_at DESC
     LIMIT 4`
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    tag: String(row.tag ?? ""),
    description: String(row.description ?? ""),
    submittedAt: row.submitted_at ? new Date(String(row.submitted_at)).toISOString() : new Date().toISOString(),
  }));
}

export default async function LandingPage() {
  const [{ conjuntos: destacados }, totalConjuntos, aportesRecientes, cifras, campanasDestacadas] = await Promise.all([
    buscarConjuntosAbiertos({ orden: "cobertura" }),
    contarConjuntosPublicados(),
    obtenerAportesRecientes(),
    obtenerCifras(),
    obtenerCampanasDestacadas(),
  ]);

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
          <ButtonLink href="/registro" variant="primary">
            Crear una campaña
          </ButtonLink>
          <ButtonLink href="/campanas" variant="secondary">
            Explorar campañas
          </ButtonLink>
        </div>

        {aportesRecientes.length > 0 ? (
          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            {aportesRecientes.map((post) => (
              <div
                key={post.id}
                className="flex flex-col justify-between rounded-lg border border-line bg-surface p-4 text-left"
                style={{ minHeight: 140 }}
              >
                <p className="text-[13px] leading-snug text-ink">
                  &ldquo;{post.description.length > 90 ? `${post.description.slice(0, 90)}…` : post.description}&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-accent">{comoHashtag(post.tag)}</p>
                    <p className="font-mono text-[11px] text-ink-3">
                      {new Date(post.submittedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Tag tone="ok">Aprobado</Tag>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-14 text-[13px] text-ink-3">
            Todavía no hay aportes aprobados que mostrar aquí.
          </p>
        )}
      </main>

      <section className="w-full bg-ink" aria-label="La plataforma en cifras">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
          {[
            { valor: cifras.campanasCreadas, etiqueta: "Campañas creadas" },
            { valor: cifras.participantes, etiqueta: "Participantes" },
            { valor: cifras.datosRecolectados, etiqueta: "Datos recolectados" },
            { valor: cifras.organizaciones, etiqueta: "Organizaciones" },
          ].map((k) => (
            <div key={k.etiqueta}>
              <p className="font-mono text-2xl font-extrabold text-white">{nf.format(k.valor)}</p>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-widest text-white/60">
                {k.etiqueta}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-4xl px-6 pb-24 pt-16">
        <div className="mb-9 text-center">
          <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
            El proceso
          </p>
          <h2 className="text-[28px] font-extrabold tracking-tight text-ink">
            Tres pasos, de la idea al dato
          </h2>
        </div>
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PASOS.map((p) => (
            <li key={p.numero}>
              <p className="mb-1.5 font-mono text-[11px] text-ink-3" aria-hidden="true">
                {p.numero}
              </p>
              <h3 className="mb-1 text-[13.5px] font-semibold text-ink">{p.titulo}</h3>
              <p className="text-[13px] leading-relaxed text-ink-2">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {campanasDestacadas.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-24" aria-label="Campañas destacadas">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-extrabold text-ink">Campañas destacadas</h2>
            <Link href="/campanas" className="text-[13px] font-semibold text-accent hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {campanasDestacadas.map((c, i) => {
              const pct = c.goalContributions
                ? Math.min(100, Math.round((c.currentContributions / c.goalContributions) * 100))
                : 0;
              return (
                <Link key={c.id} href={`/campanas/${c.id}`}>
                  <Card className="h-full transition-colors hover:border-accent">
                    <div className={`-mx-4 -mt-4 mb-3 h-24 rounded-t-lg bg-gradient-to-br ${COVER_GRADIENTS[i % COVER_GRADIENTS.length]}`} />
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-[15px] font-bold text-ink">{c.name}</p>
                      <Tag tone="ok">Activa</Tag>
                    </div>
                    <ProgressBar pct={pct} tone="ok" />
                    <p className="mt-2 font-mono text-[11px] text-ink-3">
                      {nf.format(c.participants)} participantes · {pct}% de la meta
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {destacados.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-24" aria-label="Datos abiertos">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-ink">Datos abiertos</h2>
              <p className="mt-1 max-w-md text-left text-[13.5px] text-ink-2">
                Cuando una campaña cierra, sus aportes aprobados se publican como un conjunto
                consultable. {nf.format(totalConjuntos)}{" "}
                {totalConjuntos === 1 ? "conjunto disponible" : "conjuntos disponibles"}.
              </p>
            </div>
            <Link href="/datos" className="text-[13px] font-semibold text-accent hover:underline">
              Explorar el catálogo →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {destacados.slice(0, 3).map((c) => (
              <Link key={c.id} href={`/datos/${c.id}`}>
                <Card className="h-full transition-colors hover:border-accent">
                  <p className="text-[14px] font-bold text-ink">{c.name}</p>
                  <p className="mt-1 text-[12px] text-ink-2">
                    {c.organizer || "Sin organización"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(c.formats.length > 0 ? c.formats : c.dataTypes.map((dt) => DATA_TYPE_LABELS[dt] ?? dt))
                      .slice(0, 3)
                      .map((f) => (
                        <Tag key={f}>{f}</Tag>
                      ))}
                  </div>
                  <p className="mt-2.5 font-mono text-[11px] text-ink-3">
                    {nf.format(c.approvedContributions)} aportes · {c.sizeLabel} ·{" "}
                    {nf.format(c.downloads)} descargas
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="w-full bg-ink px-6 py-16 text-center">
        <h2 className="mx-auto max-w-xl text-[26px] font-extrabold tracking-tight text-white">
          ¿Tienes un proyecto con impacto social?
        </h2>
        <p className="mt-2.5 text-[13px] text-white/65">
          Publica tu primera campaña y empieza a recolectar datos en minutos.
        </p>
        <ButtonLink href="/registro" variant="primary" className="mt-6 inline-flex">
          Comenzar ahora
        </ButtonLink>
      </section>

      <PublicFooter />
    </div>
  );
}
