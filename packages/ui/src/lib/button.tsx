import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ children, className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-[#1f2937] text-white shadow-sm hover:bg-[#111827]": variant === "primary",
          "border border-black/[0.1] bg-white text-text shadow-sm hover:bg-[#f8fafc]": variant === "secondary",
          "bg-transparent text-text hover:bg-black/[0.04]": variant === "ghost",
          "bg-rose-600 text-white hover:bg-rose-700": variant === "danger",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
