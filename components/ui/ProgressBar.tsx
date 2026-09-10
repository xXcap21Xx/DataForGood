interface ProgressBarProps {
  pct: number;
  tone?: "accent" | "ok";
}

export default function ProgressBar({ pct, tone = "accent" }: ProgressBarProps) {
  const fill = tone === "ok" ? "bg-ok" : "bg-accent";
  const clamped = Math.min(Math.max(pct, 0), 100);

  return (
    <div className="h-[7px] w-full overflow-hidden rounded-pill bg-sunken">
      <div
        className={`h-full rounded-pill ${fill}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
