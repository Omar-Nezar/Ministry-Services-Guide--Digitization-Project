import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Card } from "@/components/ui/card";
import { DEFAULT_LABEL_COLOR, divisionTitle, guideApi, serviceTitle } from "@/lib/guide-api";
import { useFetch } from "@/lib/use-fetch";
import { GuideBreadcrumbs } from "./guide-breadcrumbs";
import { guidePaths } from "./paths";

/** The services of one category as cards. */
export function GuideDivision() {
  const { isArabic } = useLanguage();
  const { divisionId } = useParams();
  const { data, error, loading } = useFetch(divisionId ?? null, (signal) => guideApi.division(Number(divisionId), signal));
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  if (error) return <p className="text-destructive">{isArabic ? "تعذر تحميل المجال." : "Unable to load this category."}</p>;
  if (!data || (loading && data.id !== Number(divisionId))) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-6xl">
      <GuideBreadcrumbs items={[{ label: divisionTitle(data, isArabic) }]} />

      <header className="mb-8 flex items-center gap-3">
        <span aria-hidden="true" className="h-10 w-1.5 rounded-full" style={{ background: data.color ?? DEFAULT_LABEL_COLOR }} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{divisionTitle(data, isArabic)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isArabic ? `${data.services.length} خدمة` : `${data.services.length} services`}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.services.map((s, i) => (
          <Link
            key={s.id}
            to={guidePaths.service(s.id)}
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Card className="h-full gap-0 p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-primary/5">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground tabular-nums">
                  {i + 1}
                </span>
                <h2 className="line-clamp-3 font-semibold leading-relaxed">{serviceTitle(s.name)}</h2>
              </div>
              {s.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs">
                {s.duration ? (
                  <span className="min-w-0 truncate text-muted-foreground">
                    {isArabic ? "المدة: " : "Duration: "}
                    {s.duration}
                  </span>
                ) : (
                  <span />
                )}
                <span className="flex shrink-0 items-center gap-1 font-medium text-primary">
                  {isArabic ? "التفاصيل" : "Details"}
                  <Arrow
                    aria-hidden="true"
                    className={`size-3.5 transition-transform ${isArabic ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}
                  />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 h-14 w-72 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
