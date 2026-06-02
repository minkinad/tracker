import type { HTMLAttributes, PropsWithChildren } from "react";
import clsx from "clsx";

interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-black/[0.08] bg-white/92 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
