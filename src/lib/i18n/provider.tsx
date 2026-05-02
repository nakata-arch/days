"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import messages, { Locale, LOCALES } from "./messages";

const STORAGE_KEY = "days:locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ja",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    } else {
      // ブラウザ言語を初期推定
      const browserLang = navigator.language.toLowerCase();
      const detected: Locale = browserLang.startsWith("ja") ? "ja" : "en";
      setLocaleState(detected);
      document.documentElement.lang = detected;
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** 翻訳フック。`t("today.reportHint", { n: 3 })` のように使う。 */
export function useTranslation() {
  const { locale, setLocale } = useLocale();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const segments = key.split(".");
    let value: any = messages[locale];
    for (const seg of segments) {
      value = value?.[seg];
      if (value === undefined) break;
    }
    if (typeof value !== "string") return key;
    if (params) {
      return Object.entries(params).reduce(
        (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
        value
      );
    }
    return value;
  };

  return { t, locale, setLocale };
}
