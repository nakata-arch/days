"use client";

import { useTranslation } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/messages";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="border border-rule bg-paper">
      <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
        <span className="font-sans text-[10px] tracking-[0.2em] text-ink-faint">
          {t("settings.languageLabel")}
        </span>
      </div>
      <div className="flex">
        {OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLocale(opt.value)}
            className={`flex-1 py-3 font-sans text-xs tracking-[0.1em] transition-colors ${
              i > 0 ? "border-l border-rule" : ""
            } ${
              locale === opt.value
                ? "bg-ink text-paper"
                : "text-ink hover:bg-paper-warm"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
