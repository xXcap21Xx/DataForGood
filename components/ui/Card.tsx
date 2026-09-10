import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  highlighted?: boolean;
}

export default function Card({
  children,
  highlighted,
  className = "",
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-lg border bg-surface p-4 shadow-sm ${
        highlighted ? "border-accent" : "border-line"
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
