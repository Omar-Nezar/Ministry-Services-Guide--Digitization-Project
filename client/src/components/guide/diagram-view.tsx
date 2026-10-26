import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Drawing } from "@/components/flowchart/copy-canvas";
import { isCopyDoc } from "@/components/flowchart/types";
import { useLanguage } from "@/components/settings/language-context";
import { guideApi } from "@/lib/guide-api";
import { useFetch } from "@/lib/use-fetch";

/**
 * A flowchart, read-only, drawn as it is in Excel. It sits on a sheet like the documentation (same width, same padding)
 * and is scaled to fit inside one page height, so a big diagram never makes the guide uneven. "Full size" scrolls instead.
 */
export function DiagramView({ id, title }: { id: number; title: string }) {
  const { isArabic } = useLanguage();
  const { data, error } = useFetch(String(id), (signal) => guideApi.flowchart(id, signal));
  const [full, setFull] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const doc = isCopyDoc(data) ? data : null;
  const maxHeight = Math.round(Math.max(width, 320) * 0.6); // the page height used for the documentation

  return (
    <div ref={ref} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {doc && doc.shapes.length > 0 && (
          <button
            type="button"
            onClick={() => setFull((v) => !v)}
            className="ms-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {full ? <Minimize2 aria-hidden="true" className="size-3.5" /> : <Maximize2 aria-hidden="true" className="size-3.5" />}
            {full ? (isArabic ? "ملاءمة الصفحة" : "Fit to page") : isArabic ? "الحجم الكامل" : "Full size"}
          </button>
        )}
      </div>

      {error && (
        <p className="py-6 text-center text-sm text-destructive">
          {isArabic ? "تعذر تحميل المخطط." : "Unable to load the flowchart."}
        </p>
      )}
      {!data && !error && <div className="h-80 animate-pulse rounded-md bg-muted" />}
      {data !== undefined && !doc && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {isArabic ? "لا يمكن عرض هذا المخطط." : "This flowchart cannot be shown."}
        </p>
      )}
      {doc && (
        // white like the Excel page, also in dark mode; an Arabic sheet starts at its right edge
        <div dir={doc.rtl ? "rtl" : "ltr"} className={full ? "overflow-auto rounded-md border bg-white" : "rounded-md bg-white"}>
          <svg
            viewBox={`0 0 ${doc.width} ${doc.height}`}
            width={full ? doc.width : undefined}
            height={full ? doc.height : undefined}
            style={full ? undefined : { width: "100%", maxHeight }}
            className={full ? "max-w-none" : "block"}
            role="img"
            aria-label={title}
          >
            <Drawing doc={doc} />
          </svg>
        </div>
      )}
    </div>
  );
}
