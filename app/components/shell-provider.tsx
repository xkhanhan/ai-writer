"use client";

import { ThemeProvider } from "@/shared/ui/theme";

export function ShellProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
