import Link from "next/link";
import { campaigns } from "@/data/screensData";
import CampaignCard from "@/components/cards/CampaignCard";
import Button from "@/components/ui/Button";

const TAGS = ["Todas", "Medio ambiente", "Salud y bienestar", "Educación", "Infraestructura"];

export default async function CampanasPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const activeTag = tag ?? "Todas";
  const filtered =
    activeTag === "Todas" ? campaigns : campaigns.filter((c) => c.tag === activeTag);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Campañas disponibles</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Descubre proyectos con impacto social cerca de ti.
          </p>
        </div>
        <Button variant="primary" size="sm">
          Crear campaña +
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const active = tag === activeTag;
          const href = tag === "Todas" ? "/campanas" : `/campanas?tag=${encodeURIComponent(tag)}`;
          return (
            <Link
              key={tag}
              href={href}
              className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line-2 bg-surface text-ink-2 hover:border-accent"
              }`}
            >
              {tag}
              {tag === "Todas" && (
                <span className="ml-1.5 font-mono">{campaigns.length}</span>
              )}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-2">No hay campañas para esta temática todavía.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
