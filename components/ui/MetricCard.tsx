import Link from "next/link";

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Enlaces opcionales al pie de la tarjeta, p. ej. a un dashboard o una lista. */
  links?: { label: string; href: string }[];
}

export default function MetricCard({ label, value, links }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="mb-1 text-[12px] text-ink-2">{label}</p>
      <p className="text-2xl font-extrabold text-ink">{value}</p>
      {links && links.length > 0 && (
        <div className="mt-4 flex items-center border-t border-line pt-3">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[12px] font-semibold text-accent hover:text-accent-deep hover:underline ${
                i > 0 ? "ml-3.5 border-l border-line-2 pl-3.5" : ""
              }`}
            >
              {link.label} <span aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
