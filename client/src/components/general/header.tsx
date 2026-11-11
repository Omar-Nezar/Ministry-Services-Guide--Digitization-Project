import { useState } from "react";
import { FileDown, Landmark, Languages } from "lucide-react";
import { Link } from "react-router";
import { AccessibilityControls } from "@/components/settings/accessibility-controls";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/settings/language-context";
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
      <header className="w-full border-b border-[#d5dce2] bg-[#e8edf1]">
        <div className="mx-auto flex max-w-7xl [direction:ltr] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 justify-start gap-2 rounded-full border-[#c7d1d9] bg-white px-3 text-left text-xs font-semibold text-slate-700 shadow-sm hover:border-[#aab9c5] hover:bg-white hover:text-slate-900 focus-visible:ring-primary/30"
            onClick={toggleLanguage}
            aria-label={isArabic ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
          >
            <Languages aria-hidden="true" className="size-4 text-primary" />
            <span>{isArabic ? "English" : "العربية"}</span>
          </Button>
          <Link
            to="/"
            aria-label={isArabic ? "الصفحة الرئيسية" : "Home"}
            className="inline-flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={moh_logo_full}
              alt="Ministry of Housing Logo"
              className="block h-12 w-auto max-w-55 object-contain sm:h-14"
            />
          </Link>
        </div>
      </header>
      <header className="relative z-40 border-b border-[color-mix(in_oklch,var(--secondary-accent-foreground)_25%,var(--secondary-accent))] bg-[var(--secondary-accent)] text-[var(--secondary-accent-foreground)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
            aria-label={isArabic ? "الصفحة الرئيسية" : "Home"}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <span>
              <h2 className="text-[0.8rem] font-semibold leading-[1.1]">
                {isArabic ? "دليل الخدمات" : "Services Catalogue"}
              </h2>
              <h3 className="mt-0.5 text-[0.65rem] font-medium leading-[1.1] text-[color-mix(in_oklch,var(--secondary-accent-foreground)_85%,transparent)]">
                {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
              </h3>
              <p className="mt-0.5 text-[0.6rem] leading-[1.1] text-[color-mix(in_oklch,var(--secondary-accent-foreground)_70%,transparent)]">
                {isArabic ? "المديرية العامة للتطوير والدراسات" : "General Directorate for Development and Studies"}
              </p>
            </span>
          </Link>

          {links.length > 0 && (
            <nav
              className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-0 sm:w-auto"
              aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
            >
              {links.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_oklch,var(--secondary-accent-foreground)_85%,transparent)] outline-none transition hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] hover:text-[var(--secondary-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
                >
                  {isArabic ? item.arabicLabel : item.label}
                </a>
              ))}
            </nav>
          )}

          <div className="ms-auto flex items-center gap-2">
            <ThemeSwitcher isArabic={isArabic} compact />
            <AccessibilityControls isArabic={isArabic} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 whitespace-nowrap border-[color-mix(in_oklch,var(--secondary-accent-foreground)_35%,transparent)] bg-transparent text-[var(--secondary-accent-foreground)] hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] hover:text-[var(--secondary-accent-foreground)]"
              onClick={downloadPdf}
              disabled={pdf.busy}
              aria-label={pdfLabel}
            >
              <FileDown aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{pdfLabel}</span>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
