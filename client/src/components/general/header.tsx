import { useState } from "react";
import { FileDown, Languages, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { AccessibilityControls } from "@/components/settings/accessibility-controls";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { useLanguage } from "@/components/settings/language-context";
import { cn } from "@/lib/utils";
import { barButtonClass } from "./bar-button";
import moh_logo_full from "@/assets/moh_logo_full.png";

export type HeaderLink = {
  href: string;
  label: string;
  arabicLabel: string;
};

export function Header({ links = [] }: { links?: HeaderLink[] }) {
  const { isArabic, toggleLanguage } = useLanguage();
  const [pdf, setPdf] = useState({ busy: false, failed: false, done: 0, total: 0 });

  async function downloadPdf() {
    setPdf({ busy: true, failed: false, done: 0, total: 0 });
    try {
      const { exportGuidePdf } = await import("@/components/guide/export-pdf");
      await exportGuidePdf((done, total) => setPdf({ busy: true, failed: false, done, total }));
      setPdf((current) => ({ ...current, busy: false }));
    } catch {
      setPdf({ busy: false, failed: true, done: 0, total: 0 });
    }
  }

  const pdfLabel = pdf.busy
    ? isArabic
      ? `جارٍ التحضير… ${pdf.done}/${pdf.total}`
      : `Preparing… ${pdf.done}/${pdf.total}`
    : pdf.failed
      ? isArabic
        ? "تعذر التصدير، حاول مجددًا"
        : "Export failed, try again"
      : isArabic
        ? "تصدير الدليل PDF"
        : "Export catalogue PDF";

  return (
    <>
      {/* Official masthead: the ministry logo sits on its own band colour */}
      <div className="brand-strip" aria-hidden="true" />
      <div className="relative border-b border-[#d4dce4] bg-brand-surface text-brand-surface-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            to="/"
            aria-label={isArabic ? "الصفحة الرئيسية" : "Home"}
            className="inline-flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-surface-foreground/50"
          >
            <img
              src={moh_logo_full}
              alt={isArabic ? "شعار وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning logo"}
              className="block h-10 w-auto max-w-[min(15rem,60vw)] object-contain sm:h-13"
            />
          </Link>

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={isArabic ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
            lang={isArabic ? "en" : "ar"}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-brand-surface-foreground/15 bg-white/55 px-3.5 text-sm font-semibold text-brand-surface-foreground shadow-card outline-none transition duration-200 hover:border-brand-surface-foreground/30 hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-surface-foreground/50 active:scale-[0.98]"
          >
            <Languages aria-hidden="true" className="size-4 opacity-80" />
            <span>{isArabic ? "English" : "العربية"}</span>
          </button>
        </div>
      </div>

      {/* The ministry bar follows the chosen secondary colour and stays at the top */}
      <header className="header-elevate sticky top-0 z-40 border-b-2 border-brand-gold/70 bg-secondary-accent text-secondary-accent-foreground">
        <div className="mx-auto flex h-(--header-h) max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-secondary-accent-foreground"
            aria-label={isArabic ? "الصفحة الرئيسية" : "Home"}
          >
            <span
              aria-hidden="true"
              className="h-8 w-[3px] shrink-0 rounded-full bg-brand-gold transition-transform duration-300 ease-brand group-hover:scale-y-125"
            />
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] leading-tight font-semibold tracking-tight">
                {isArabic ? "دليل الخدمات" : "Services Catalogue"}
              </span>
              <span className="block truncate text-xs leading-tight text-secondary-accent-foreground/75">
                {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
              </span>
            </span>
          </Link>

          {links.length > 0 && (
            <nav className="hidden items-center gap-1 md:flex" aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}>
              {links.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-secondary-accent-foreground/85 outline-none transition hover:bg-secondary-accent-foreground/12 hover:text-secondary-accent-foreground focus-visible:ring-2 focus-visible:ring-secondary-accent-foreground"
                >
                  {isArabic ? item.arabicLabel : item.label}
                </a>
              ))}
            </nav>
          )}

          <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeSwitcher isArabic={isArabic} compact />
            <AccessibilityControls isArabic={isArabic} />
            <button
              type="button"
              className={barButtonClass}
              onClick={downloadPdf}
              disabled={pdf.busy}
              aria-label={pdfLabel}
              title={pdfLabel}
            >
              {pdf.busy ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <FileDown aria-hidden="true" className="size-4" />
              )}
              <span className={cn(pdf.busy || pdf.failed ? "max-sm:hidden" : "hidden lg:inline", "tabular-nums")}>{pdfLabel}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
