import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses } from "./Button";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

type Props = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export default function ButtonLink({ variant, size, className, ...rest }: Props) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
