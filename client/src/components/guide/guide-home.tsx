import { Link, useOutletContext } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Card } from "@/components/ui/card";
import { DEFAULT_LABEL_COLOR, divisionTitle } from "@/lib/guide-api";
import type { GuideContext } from "./guide-layout";
import { guidePaths } from "./paths";

/** The categories (service_divisions) as cards. */
export function GuideHome() {
  const { isArabic } = useLanguage();
  const { tree, treeError } = useOutletContext<GuideContext>();
  const total = tree?.reduce((n, d) => n + d.services.length, 0);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-5xl">
      <section className="py-6 text-center md:py-10">
        <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          {total != null
            ? isArabic
              ? `${total} خدمة في ${tree!.length} مجالات`
              : `${total} services in ${tree!.length} categories`
            : isArabic
              ? "دليل خدمات الوزارة"
              : "Ministry Services Guide"}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
          {isArabic ? "دليل خدمات الوزارة" : "Ministry Services Guide"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {isArabic
            ? "اختر المجال لعرض خدماته، ثم اختر الخدمة لعرض وصفها واشتراطاتها والمستندات المطلوبة ورسومها."
            : "Choose a category to see its services, then a service for its description, requirements, documents and fees."}
        </p>
      </section>

      {treeError && (
        <p className="text-center text-destructive">{isArabic ? "تعذر تحميل المجالات." : "Unable to load the categories."}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!tree &&
          !treeError &&
          Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
        {tree?.map((d) => (
          <Link
            key={d.id}
            to={guidePaths.division(d.id)}
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Card className="h-full gap-0 p-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-primary/5">
              <div className="h-1.5" style={{ background: d.color ?? DEFAULT_LABEL_COLOR }} />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{divisionTitle(d, isArabic)}</h2>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                    {isArabic ? `${d.services.length} خدمة` : `${d.services.length} services`}
                  </span>
                </div>
                {isArabic && d.nameAr && d.nameAr !== d.name && (
                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                    {d.name}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-primary">
                  {isArabic ? "عرض الخدمات" : "View services"}
                  <Arrow
                    aria-hidden="true"
                    className={`size-4 transition-transform ${isArabic ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}
                  />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
