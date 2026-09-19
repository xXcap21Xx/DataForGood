import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-ok text-white border-ok hover:bg-[#0a6244]",
  secondary: "bg-surface text-ink border-line-2 hover:border-accent",
  danger: "bg-surface text-danger border-danger hover:bg-danger-tint",
  ghost: "bg-transparent text-ink-2 border-transparent hover:text-ink",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[12.5px] py-2 px-3.5",
  md: "text-sm py-3 px-5",
};

export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-pill border font-bold transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
