"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  translations,
  type Locale,
  type TranslationKey,
} from "@/constants/translations";

const STORAGE_KEY = "bh.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && (LOCALES as readonly string[]).includes(stored)) {
        setLocaleState(stored as Locale);
      }
    } catch {}
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return [ctx.locale, ctx.setLocale];
}

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key]?.[locale] ?? (key as string);
}

export function useT(): (key: TranslationKey) => string {
  const [locale] = useLocale();
  return (key) => t(key, locale);
}
