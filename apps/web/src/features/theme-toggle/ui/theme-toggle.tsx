"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/15 hover:text-white"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle color theme"
    >
      {resolvedTheme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
