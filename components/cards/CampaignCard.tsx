import Link from "next/link";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import type { Campaign } from "@/types";

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = new Date(start).toLocaleDateString("es-MX", opts);
  const e = new Date(end).toLocaleDateString("es-MX", opts);
  return `${s} – ${e}`;
}

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.round((campaign.currentContributions / campaign.goalContributions) * 100);
  const isActive = campaign.status === "activa";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Tag tone="ok">{campaign.tag}</Tag>
        <Tag>{isActive ? "● Activa" : campaign.status === "en_revision" ? "◦ Próxima" : campaign.status}</Tag>
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">{campaign.name}</h3>
        <p className="mt-1 text-[13px] text-ink-2">{campaign.description}</p>
        <p className="mt-1.5 font-mono text-[11px] text-ink-2">
          {formatDateRange(campaign.startDate, campaign.endDate)}
        </p>
      </div>

      <ProgressBar pct={isActive ? pct : 0} />

      <div className="flex gap-6">
        <div>
          <p className="font-mono text-[15px] font-bold text-ink">
            {campaign.currentContributions}/{campaign.goalContributions}
          </p>
          <p className="text-[11px] text-ink-3">aportes</p>
        </div>
        <div>
          <p className="font-mono text-[15px] font-bold text-ink">
            {campaign.daysRemaining ?? "—"}
          </p>
          <p className="text-[11px] text-ink-3">días restantes</p>
        </div>
      </div>

      <Link href={`/campanas/${campaign.id}`}>
        <Button className="w-full">Ver detalles</Button>
      </Link>
    </Card>
  );
}
