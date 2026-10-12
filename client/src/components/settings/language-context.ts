import { createContext, useContext } from "react";

export type LanguageContextValue = {
  isArabic: boolean;
  toggleLanguage: () => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }
  return context;
}
