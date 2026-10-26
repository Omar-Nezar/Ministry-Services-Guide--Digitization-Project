import { Fragment } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { guidePaths } from "./paths";

export function GuideBreadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  const { isArabic } = useLanguage();
  const Separator = isArabic ? ChevronLeft : ChevronRight;

  return (
    <nav
      aria-label={isArabic ? "مسار التنقل" : "Breadcrumb"}
      className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link to={guidePaths.home} className="hover:text-foreground">
        {isArabic ? "الرئيسية" : "Home"}
      </Link>
      {items.map((item) => (
        <Fragment key={item.label}>
          <Separator aria-hidden="true" className="size-3.5 shrink-0 opacity-60" />
          {item.to ? (
            <Link to={item.to} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="line-clamp-1 max-w-md text-foreground">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
