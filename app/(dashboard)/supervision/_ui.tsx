import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="mb-5 inline-block text-[13px] text-ink-2 hover:text-accent">← {children}</Link>;
}

export function DisabledAction({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "danger" | "primary" }) {
  const classes = {
    default: "border-line-2 bg-surface text-ink-2",
    danger: "border-danger/40 bg-danger-tint text-danger",
    primary: "border-ok/40 bg-ok-tint text-ok",
  };

  return <button type="button" disabled className={`rounded-pill border px-3.5 py-2 text-[12.5px] font-bold opacity-75 ${classes[tone]}`}>{children}</button>;
}
