import type { CSSProperties } from "react";
import { Link, useOutletContext } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { CountUp } from "@/components/general/count-up";
import { StatisticsCharts } from "@/components/dashboard/statistics-charts";
import { DEFAULT_LABEL_COLOR, divisionTitle } from "@/lib/guide-api";
import type { GuideContext } from "./guide-layout";
import { guidePaths } from "./paths";

/** The categories (service_divisions) as cards. */
export function GuideHome() {
  const { isArabic } = useLanguage();
  const { tree, treeError } = useOutletContext<GuideContext>();
  const total = tree?.reduce((n, d) => n + d.services.length, 0);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  const stats = [
    { value: total, label: isArabic ? "خدمة" : "services" },
    { value: tree?.length, label: isArabic ? "مجالات" : "categories" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      {/* Catalogue banner in the ministry colour */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-secondary-accent px-6 py-9 text-secondary-accent-foreground shadow-lift sm:px-10 sm:py-11">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_left,black,transparent_70%)] rtl:[mask-image:linear-gradient(to_right,black,transparent_70%)]"
        >
          <div className="pattern-khatam absolute inset-0 opacity-[0.13]" />
        </div>
        <div aria-hidden="true" className="absolute -bottom-24 -end-16 -z-10 size-72 rounded-full bg-brand-gold/25 blur-3xl" />

        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="enter text-sm font-medium text-secondary-accent-foreground/75">
              {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
            </p>
            <h1 className="enter mt-2 text-3xl font-semibold tracking-tight text-balance md:text-4xl" style={{ "--i": 1 } as CSSProperties}>
              {isArabic ? "دليل خدمات الوزارة" : "Ministry Services Catalogue"}
            </h1>
            <p
              className="enter mt-3 max-w-xl leading-7 text-pretty text-secondary-accent-foreground/80"
              style={{ "--i": 2 } as CSSProperties}
            >
              {isArabic
                ? "اختر المجال لعرض خدماته، ثم اختر الخدمة لعرض وصفها واشتراطاتها والمستندات المطلوبة ورسومها."
                : "Choose a category to see its services, then a service for its description, requirements, documents and fees."}
            </p>
          </div>

          <dl className="enter flex gap-3" style={{ "--i": 3 } as CSSProperties}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-28 rounded-2xl bg-secondary-accent-foreground/10 px-5 py-4 ring-1 ring-secondary-accent-foreground/15 backdrop-blur-sm"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  {stat.value != null ? (
                    <CountUp value={stat.value} className="block text-3xl leading-none font-semibold" />
                  ) : (
                    <span aria-hidden="true" className="block h-[1.875rem] w-12 rounded-md bg-secondary-accent-foreground/15" />
                  )}
                  <span aria-hidden="true" className="mt-1.5 block text-sm text-secondary-accent-foreground/75">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {treeError && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-destructive">
          {isArabic ? "تعذر تحميل المجالات." : "Unable to load the categories."}
        </p>
      )}

      <section aria-labelledby="guide-categories" className="flex flex-col gap-4">
        <h2 id="guide-categories" className="text-lg font-semibold tracking-tight">
          {isArabic ? "تصفح حسب المجال" : "Browse by category"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {!tree &&
            !treeError &&
            Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
          {tree?.map((d, i) => {
            const color = d.color ?? DEFAULT_LABEL_COLOR;
            return (
              <Link
                key={d.id}
                to={guidePaths.division(d.id)}
                className="reveal group min-w-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <article
                  className="enter relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition duration-300 ease-brand group-hover:-translate-y-1 group-hover:border-foreground/15 group-hover:shadow-lift"
                  style={{ "--i": Math.min(i, 8) } as CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.2] transition-transform duration-500 ease-brand group-hover:scale-x-100 rtl:origin-right"
                    style={{ background: color }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg leading-snug font-semibold">{divisionTitle(d, isArabic)}</h3>
                      {isArabic && d.nameAr && d.nameAr !== d.name && (
                        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                          {d.name}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      <span className="block text-3xl leading-none font-semibold tabular-nums">{d.services.length}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{isArabic ? "خدمة" : "services"}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 pt-8 text-sm font-medium text-primary">
                    {isArabic ? "عرض الخدمات" : "View services"}
                    <Arrow
                      aria-hidden="true"
                      className="size-4 transition-transform duration-300 ease-brand group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    />
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <StatisticsCharts divisions={tree} error={Boolean(treeError)} />
    </div>
  );
}
