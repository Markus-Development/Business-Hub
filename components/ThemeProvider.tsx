"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Wraps next-themes' provider with the app's locked defaults: class-based theming
// (toggles a `.dark` class on <html>), default = Light on first load, System is a
// manual opt-in (enableSystem), and no transition flash when switching.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
