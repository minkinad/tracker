import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-black/[0.08] bg-white/88 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/35 focus:border-[#3f7cf4] focus:ring-2 focus:ring-[#3f7cf4]/12",
        className,
      )}
      {...props}
    />
  );
}
