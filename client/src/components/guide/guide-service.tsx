import { useMemo } from "react";
import { useParams } from "react-router";
import { useLanguage } from "@/components/settings/language-context";
import {
  DEFAULT_LABEL_COLOR,
  divisionTitle,
  flowchartTitle,
  guideApi,
  serviceTitle,
  uploadUrl,
  type GuideImage,
} from "@/lib/guide-api";
import type { FlowEntry } from "@/lib/guide-flow";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";
import { DiagramView } from "./diagram-view";
import { GuideBreadcrumbs } from "./guide-breadcrumbs";
import { GuideFlow } from "./guide-flow";
import { guidePaths } from "./paths";

/** A service: its documentation (labels + text), then its flowcharts, then its pictures. */
export function GuideService() {
  const { isArabic } = useLanguage();
  const { serviceId } = useParams();
  const { data, error, loading } = useFetch(serviceId ?? null, (signal) => guideApi.service(Number(serviceId), signal));
  const ready = data && !(loading && data.id !== Number(serviceId));

  const entries = useMemo<FlowEntry[]>(
    () =>
      data?.labels.map((l) => ({
        key: l.key,
        name: l.name,
        color: l.color ?? DEFAULT_LABEL_COLOR,
        html: l.html,
      })) ?? [],
    [data],
  );

  if (error) return <p className="text-destructive">{isArabic ? "تعذر تحميل الخدمة." : "Unable to load this service."}</p>;
  if (!ready) return <PageSkeleton />;

  const division = data.serviceDivision;

  return (
    <article className="mx-auto max-w-6xl">
      <GuideBreadcrumbs
        items={[
          { label: divisionTitle(division, isArabic), to: guidePaths.division(division.id) },
          { label: serviceTitle(data.name) },
        ]}
      />

      <header className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">{divisionTitle(division, isArabic)}</p>
        <h1
          className="mt-2 text-2xl leading-relaxed font-bold tracking-tight md:text-[1.7rem]"
          style={{ color: division.color ?? DEFAULT_LABEL_COLOR }}
        >
          {serviceTitle(data.name)}
        </h1>
      </header>

      <div className="flex flex-col gap-10">
        <GuideFlow entries={entries} />

        {data.flowcharts.length > 0 && (
          <section aria-labelledby="flowcharts" className="flex flex-col gap-4">
            <h2 id="flowcharts" className="text-lg font-bold text-primary">
              {isArabic ? "مخطط سير الإجراء" : "Procedure flowchart"}
            </h2>
            {data.flowcharts.map((f) => (
              <DiagramView key={f.id} id={f.id} title={flowchartTitle(f, isArabic ? "مخطط سير الإجراء" : "Flowchart")} />
            ))}
          </section>
        )}

        {data.images.length > 0 && (
          <section aria-labelledby="pictures" className="flex flex-col gap-4">
            <h2 id="pictures" className="text-lg font-bold text-primary">
              {isArabic ? "الصور" : "Pictures"}
            </h2>
            {data.images.map((image) => (
              <Picture key={image.id} image={image} />
            ))}
          </section>
        )}
      </div>
    </article>
  );
}

function Picture({ image }: { image: GuideImage }) {
  return (
    <figure className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs">
      <img
        src={uploadUrl(image.imagePath)}
        alt={image.caption ?? ""}
        className={cn("w-full rounded-md bg-muted", image.imageFit === "cover" ? "h-[75vh] object-cover" : "max-h-[85vh] object-contain")}
      />
      {image.caption && <figcaption className="text-center text-sm text-muted-foreground">{image.caption}</figcaption>}
    </figure>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 space-y-3">
        <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
