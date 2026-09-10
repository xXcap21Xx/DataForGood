interface MetricCardProps {
  label: string;
  value: string | number;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="mb-1 text-[12px] text-ink-2">{label}</p>
      <p className="text-2xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
