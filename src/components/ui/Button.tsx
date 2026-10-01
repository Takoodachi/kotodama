import Link from "next/link";
import { cn } from "@/lib/cn";
import { SplitText } from "./SplitText";

type Variant = "primary" | "gold" | "ghost";
type Size = "md" | "lg";

const BASE =
  "group relative inline-flex select-none items-center justify-center gap-2.5 rounded-full font-medium tracking-wide " +
  "transition-[transform,background-color,border-color,color,box-shadow] duration-300 active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-35";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-crimson text-on-accent hover:bg-crimson-hover " +
    "shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_12px_40px_-12px_rgb(200_16_46/0.75)]",
  gold: "border border-gold/45 text-gold-bright hover:border-gold hover:bg-gold/10",
  ghost: "border border-line text-paper hover:border-veil/25 hover:bg-veil/[0.04]",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-[15px]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Rolls the label letter by letter on hover. Only for plain-text labels. */
  split?: string;
  className?: string;
  children?: React.ReactNode;
}

type ButtonProps = CommonProps & Omit<React.ComponentProps<"button">, keyof CommonProps>;

export function Button({ variant = "ghost", size = "md", split, className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {split ? <SplitText text={split} /> : null}
      {children}
    </button>
  );
}

type LinkButtonProps = CommonProps & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function LinkButton({ variant = "ghost", size = "md", split, className, children, href, ...rest }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {split ? <SplitText text={split} /> : null}
      {children}
    </Link>
  );
}
