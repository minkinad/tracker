import type { PropsWithChildren } from "react";
import clsx from "clsx";

interface BadgeProps extends PropsWithChildren {
  tone?: "neutral" | "success" | "warning" | "danger";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={clsx("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold", {
        "bg-[#eef2f6] text-[#334155]": tone === "neutral",
        "bg-[#dcfce7] text-[#166534]": tone === "success",
        "bg-[#fff1d6] text-[#b45309]": tone === "warning",
        "bg-[#ffe0e5] text-[#be123c]": tone === "danger",
      })}
    >
      {children}
    </span>
  );
}
