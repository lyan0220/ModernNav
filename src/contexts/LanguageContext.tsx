import React, { createContext, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import zh from "../locales/zh.json";

type Language = "en" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const translations: Record<Language, Record<string, string>> = { en, zh };

// Non-reactive lookup for use outside React (services, event handlers). Reads
// the persisted language, which the provider keeps in sync on every change.
export function translate(key: string, params?: Record<string, string>): string {
  let lang: Language = "en";
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("modernNavLanguage") as Language | null;
    if (saved === "en" || saved === "zh") lang = saved;
  }
  return interpolate(translations[lang][key] || key, params);
}

function interpolate(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  let result = text;
  Object.entries(params).forEach(([k, v]) => {
    result = result.replace(`{${k}}`, v);
  });
  return result;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const savedLang = localStorage.getItem("modernNavLanguage") as Language;
    return savedLang === "en" || savedLang === "zh" ? savedLang : "en";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("modernNavLanguage", lang);
  };

  const t = (key: string, params?: Record<string, string>) =>
    interpolate(translations[language][key] || key, params);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
