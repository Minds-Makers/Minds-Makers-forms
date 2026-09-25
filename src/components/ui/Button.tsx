import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "destructive";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-4 min-h-[44px] text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan text-cyan-ink hover:brightness-110 hover:ring-4 hover:ring-cyan-soft",
  ghost: "bg-transparent text-ink border border-line2 hover:bg-cyan-soft",
  destructive: "bg-transparent text-err border border-err/40 hover:bg-err/10",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ variant = "primary", className = "", ...props }, ref) => (
  <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />
));
Button.displayName = "Button";
