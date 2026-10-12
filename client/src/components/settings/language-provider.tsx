import { useEffect, useState, type ReactNode } from "react";
import { LanguageContext } from "@/components/settings/language-context";
const LANGUAGE_STORAGE_KEY = "ministry-services-language";

function getInitialLanguage(): boolean {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "ar";
  } catch (error) {
    console.warn("Unable to read saved language preference.", error);
    return false;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [isArabic, setIsArabic] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = isArabic ? "ar" : "en";
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.title = isArabic
      ? "دليل الخدمات الحكومية"
      : "Ministry Services Guide";

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, isArabic ? "ar" : "en");
    } catch (error) {
      console.warn("Unable to save language preference.", error);
    }
  }, [isArabic]);

  const value = {
    isArabic,
    toggleLanguage: () => setIsArabic((current) => !current),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
