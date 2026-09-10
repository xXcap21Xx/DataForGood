import { ReactNode } from "react";

type Tone = "default" | "ok" | "warn" | "danger" | "on";

interface TagProps {
  children: ReactNode;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  default: "bg-surface border-line-2 text-ink-2",
  ok: "bg-ok-tint border-ok-tint text-ok",
  warn: "bg-warn-tint border-warn-tint text-warn",
  danger: "bg-danger-tint border-danger-tint text-danger",
  on: "bg-accent border-accent text-white",
};

export default function Tag({ children, tone = "default" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2.5 py-1 text-[12.5px] font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
