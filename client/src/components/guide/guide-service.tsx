import { useMemo } from "react";
import { Images, Workflow } from "lucide-react";
import { useParams } from "react-router";
import { useLanguage } from "@/components/settings/language-context";
import {
  DEFAULT_LABEL_COLOR,
  diagramColor,
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

  if (error)
    return (
      <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive">
        {isArabic ? "تعذر تحميل الخدمة." : "Unable to load this service."}
      </p>
    );
  if (!ready) return <PageSkeleton />;

  const division = data.serviceDivision;
  const color = division.color ?? DEFAULT_LABEL_COLOR;

  return (
    <article className="mx-auto max-w-6xl">
      <GuideBreadcrumbs
        items={[
          { label: divisionTitle(division, isArabic), to: guidePaths.division(division.id) },
          { label: serviceTitle(data.name) },
        ]}
      />

      <header className="relative isolate mb-8 overflow-hidden rounded-2xl border bg-card px-6 py-7 shadow-card sm:px-8">
        <span aria-hidden="true" className="absolute inset-y-0 start-0 w-1.5" style={{ background: color }} />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 text-foreground [mask-image:linear-gradient(to_left,black,transparent_55%)] rtl:[mask-image:linear-gradient(to_right,black,transparent_55%)]"
        >
          <div className="pattern-khatam absolute inset-0 opacity-[0.05]" />
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
          {divisionTitle(division, isArabic)}
        </p>
        <h1 className="mt-3 text-2xl leading-relaxed font-semibold tracking-tight text-balance md:text-[1.75rem]">
          {serviceTitle(data.name)}
        </h1>
      </header>

      <div className="flex flex-col gap-10">
        <GuideFlow entries={entries} />

        {data.flowcharts.length > 0 && (
          <section aria-labelledby="flowcharts" className="reveal flex flex-col gap-4">
            <h2 id="flowcharts" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <SectionIcon icon={Workflow} />
              {isArabic ? "مخطط سير الإجراء" : "Procedure flowchart"}
            </h2>
            {data.flowcharts.map((f) => (
              <DiagramView key={f.id} id={f.id} color={diagramColor(data)} title={flowchartTitle(f, isArabic ? "مخطط سير الإجراء" : "Flowchart")} />
            ))}
          </section>
        )}

        {data.images.length > 0 && (
          <section aria-labelledby="pictures" className="reveal flex flex-col gap-4">
            <h2 id="pictures" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <SectionIcon icon={Images} />
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

function SectionIcon({ icon: Icon }: { icon: typeof Workflow }) {
  return (
    <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
  );
}

function Picture({ image }: { image: GuideImage }) {
  return (
    <figure className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card">
      <img
        src={uploadUrl(image.imagePath)}
        alt={image.caption ?? ""}
        className={cn("w-full rounded-lg bg-muted", image.imageFit === "cover" ? "h-[75vh] object-cover" : "max-h-[85vh] object-contain")}
      />
      {image.caption && <figcaption className="text-center text-sm text-muted-foreground">{image.caption}</figcaption>}
    </figure>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="skeleton mb-6 h-4 w-64 rounded-full" />
      <div className="skeleton mb-8 h-32 rounded-2xl" />
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  );
}
