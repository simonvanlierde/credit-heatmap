"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Wraps the app in next-themes so the header toggle can flip `class="dark"` on
 * <html>. `defaultTheme="system"` + `enableSystem` follows the OS on first
 * visit; the choice is then persisted. Lives in its own Client Component so
 * layout.tsx can stay a Server Component.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemeProvider>
  );
}
