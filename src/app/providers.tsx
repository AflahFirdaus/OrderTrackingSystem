"use client";

import { ModeThemeProvider } from "@/components/providers/mode-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ModeThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ModeThemeProvider>
  );
}
