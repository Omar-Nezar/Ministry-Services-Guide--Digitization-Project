import { Landmark, Languages } from "lucide-react";
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

  return (
    <>
      <header className="w-full border-b border-[#d5dce2] bg-[#e8edf1]">
        <div className="mx-auto flex max-w-7xl [direction:ltr] items-center justify-end px-4 py-3 sm:px-6 lg:px-8">
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
            aria-label={isArabic ? "الصفحة الرئيسية" : "Home"}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">
                {isArabic ? "دليل الخدمات" : "Services Catalogue"}
              </span>
              <span className="block text-xs text-[color-mix(in_oklch,var(--secondary-accent-foreground)_75%,transparent)]">
                {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
              </span>
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
              className="gap-2 border-[color-mix(in_oklch,var(--secondary-accent-foreground)_35%,transparent)] bg-transparent text-[var(--secondary-accent-foreground)] hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] hover:text-[var(--secondary-accent-foreground)]"
              onClick={toggleLanguage}
              aria-label={isArabic ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
            >
              <Languages aria-hidden="true" className="size-4" />
              <span>{isArabic ? "English" : "العربية"}</span>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
