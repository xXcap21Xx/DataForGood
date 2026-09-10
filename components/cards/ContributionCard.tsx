import Tag from "@/components/ui/Tag";
import Card from "@/components/ui/Card";
import type { Contribution } from "@/types";

const STATUS_TONE: Record<Contribution["status"], { label: string; tone: "ok" | "warn" | "danger" | "default" }> = {
  aceptado: { label: "Aceptado", tone: "ok" },
  pendiente: { label: "Pendiente", tone: "warn" },
  espera_final: { label: "Espera final", tone: "warn" },
  rechazado: { label: "Rechazado", tone: "danger" },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function formatSize(bytes?: number) {
  if (!bytes) return "—";
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export default function ContributionCard({ contribution }: { contribution: Contribution }) {
  const status = STATUS_TONE[contribution.status];

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-ink">{contribution.campaignName}</p>
        <p className="mt-1 text-[13px] text-ink-2">{contribution.description}</p>
        <div className="mt-2 flex gap-4 text-[11.5px] text-ink-3">
          <span>{formatDateTime(contribution.submittedAt)}</span>
          <span>{contribution.fileType}</span>
          <span>{formatSize(contribution.fileSizeBytes)}</span>
        </div>
      </div>
      <Tag tone={status.tone}>{status.label}</Tag>
    </Card>
  );
}
