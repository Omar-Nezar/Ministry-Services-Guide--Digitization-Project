import type { CSSProperties } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
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

  if (error)
    return (
      <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive">
        {isArabic ? "تعذر تحميل المجال." : "Unable to load this category."}
      </p>
    );
  if (!data || (loading && data.id !== Number(divisionId))) return <PageSkeleton />;

  const color = data.color ?? DEFAULT_LABEL_COLOR;

  return (
    <div className="mx-auto max-w-6xl">
      <GuideBreadcrumbs items={[{ label: divisionTitle(data, isArabic) }]} />

      <header className="relative isolate mb-8 overflow-hidden rounded-2xl border bg-card px-6 py-7 shadow-card sm:px-8">
        <span aria-hidden="true" className="absolute inset-y-0 start-0 w-1.5" style={{ background: color }} />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 text-foreground [mask-image:linear-gradient(to_left,black,transparent_55%)] rtl:[mask-image:linear-gradient(to_right,black,transparent_55%)]"
        >
          <div className="pattern-khatam absolute inset-0 opacity-[0.05]" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{divisionTitle(data, isArabic)}</h1>
          <p className="rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground tabular-nums">
            {isArabic ? `${data.services.length} خدمة` : `${data.services.length} services`}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.services.map((s, i) => (
          <Link
            key={s.id}
            to={guidePaths.service(s.id)}
            className="reveal group min-w-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <article
              className="enter flex h-full flex-col rounded-2xl border bg-card p-5 shadow-card transition duration-300 ease-brand group-hover:-translate-y-1 group-hover:border-foreground/15 group-hover:shadow-lift"
              style={{ "--i": Math.min(i, 9) } as CSSProperties}
            >
              <div className="flex items-start gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-semibold text-foreground tabular-nums transition-colors duration-300"
                  style={{ background: `color-mix(in oklch, ${color} 16%, transparent)` }}
                >
                  {i + 1}
                </span>
                <h2 className="line-clamp-3 pt-1 leading-relaxed font-semibold">{serviceTitle(s.name)}</h2>
              </div>
              {s.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 text-xs">
                {s.duration ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">
                      <span className="sr-only">{isArabic ? "المدة: " : "Duration: "}</span>
                      {s.duration}
                    </span>
                  </span>
                ) : (
                  <span />
                )}
                <span className="flex shrink-0 items-center gap-1 font-semibold text-primary">
                  {isArabic ? "التفاصيل" : "Details"}
                  <Arrow
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-300 ease-brand group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                  />
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="skeleton mb-6 h-4 w-48 rounded-full" />
      <div className="skeleton mb-8 h-24 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
