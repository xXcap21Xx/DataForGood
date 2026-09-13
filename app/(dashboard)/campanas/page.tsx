import Link from "next/link";
import CampaignCard from "@/components/cards/CampaignCard";
import Button from "@/components/ui/Button";
import { campaigns as mockCampaigns } from "@/data/screensData";
import type { Campaign, CampaignStatus, DataType } from "@/types";

const TAGS = ["Todas", "Medio ambiente", "Salud y bienestar", "Educación", "Infraestructura"];

function normalizeStatus(status: string): CampaignStatus {
  return [
    "borrador",
    "en_revision",
    "activa",
    "pausada",
    "finalizada",
    "rechazada",
  ].includes(status)
    ? (status as CampaignStatus)
    : "activa";
}

function mapApiCampaign(raw: Record<string, unknown>): Campaign {
  const status = normalizeStatus(String(raw.status ?? "activa"));
  const dataTypes = Array.isArray(raw.data_types)
    ? (raw.data_types as DataType[])
    : Array.isArray(raw.dataTypes)
      ? (raw.dataTypes as DataType[])
      : [];

  return {
    id: String(raw.id ?? ""),
    creatorId: String(raw.creator_id ?? raw.creatorId ?? ""),
    creatorName: String(raw.creator_name ?? raw.creatorName ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    tag: String(raw.tematica ?? raw.tag ?? "Medio ambiente"),
    tematica: String(raw.tematica ?? raw.tag ?? "Medio ambiente"),
    status,
    dataTypes,
    goalContributions: Number(raw.goal_contributions ?? raw.goalContributions ?? 0),
    quotaPerUser: Number(raw.quota_per_user ?? raw.quotaPerUser ?? 1),
    currentContributions: Number(raw.current_contributions ?? raw.currentContributions ?? 0),
    approvedContributions: Number(raw.approved_contributions ?? raw.approvedContributions ?? 0),
    pendingContributions: Number(raw.pending_contributions ?? raw.pendingContributions ?? 0),
    rejectedContributions: Number(raw.rejected_contributions ?? raw.rejectedContributions ?? 0),
    participants: Number(raw.participants ?? 0),
    startDate: String(raw.start_date ?? raw.startDate ?? "2026-01-01"),
    endDate: String(raw.end_date ?? raw.endDate ?? "2026-01-01"),
    locationCity: String(raw.location_city ?? raw.locationCity ?? "Tepic"),
    locationState: String(raw.location_state ?? raw.locationState ?? "Nayarit"),
    organizer: String(raw.organizer ?? ""),
    xpPerContribution: Number(raw.xp_per_contribution ?? raw.xpPerContribution ?? 0),
    isSpecial: Boolean(raw.is_special ?? raw.isSpecial ?? false),
    daysRemaining: Number(raw.days_remaining ?? raw.daysRemaining ?? 0),
    hasReviewerAssigned: Boolean(raw.has_reviewer_assigned ?? raw.hasReviewerAssigned ?? false),
    shareToken: String(raw.share_token ?? raw.shareToken ?? ""),
    shareTokenExpiresAt: String(raw.share_token_expires_at ?? raw.shareTokenExpiresAt ?? ""),
    contributions: Array.isArray(raw.aportes) ? (raw.aportes as Campaign["contributions"]) : [],
  };
}

export default async function CampanasPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const activeTag = tag ?? "Todas";

  let apiCampaigns: Campaign[] = [];
  try {
    const response = await fetch("http://localhost:3000/api/campanas", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      apiCampaigns = rows.map((c: unknown) => mapApiCampaign(c as Record<string, unknown>));
    }
  } catch {
    apiCampaigns = [];
  }

  const allCampaigns: Campaign[] = [...mockCampaigns, ...apiCampaigns];

  const filtered = activeTag === "Todas" ? allCampaigns : allCampaigns.filter((c) => c.tag === activeTag);

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
                <span className="ml-1.5 font-mono">{allCampaigns.length}</span>
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
