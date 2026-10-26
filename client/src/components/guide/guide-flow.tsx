import { useEffect, useRef, useState } from "react";
import { columnHTML, paginate, type FlowColumn, type FlowEntry } from "@/lib/guide-flow";

const PAD = 16;
const GAP = 12;
const WIDE = 720;

/**
 * The documentation of a service. Text is poured into columns automatically: one column (2 table columns) while it
 * fits the page height, then a second column (4 table columns), then further pages. Overflowing text continues
 * in the next column.
 */
export function GuideFlow({ entries }: { entries: FlowEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pages, setPages] = useState<FlowColumn[][] | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      await document.fonts?.ready;
      if (cancelled) return;
      const inner = width - PAD * 2;
      if (width < WIDE) return setPages([paginate(entries, inner, Infinity)]);
      const cols = paginate(entries, (inner - GAP) / 2, Math.round(width * 0.6));
      setPages(Array.from({ length: Math.ceil(cols.length / 2) }, (_, i) => cols.slice(i * 2, i * 2 + 2)));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [entries, width]);

  return (
    <div ref={ref} dir="rtl" className="flex flex-col gap-4">
      {!pages && <div className="h-64 animate-pulse rounded-lg bg-muted" />}
      {pages?.map((cols, i) => (
        <div key={i} className="flex gap-3 rounded-lg border bg-card p-4 shadow-xs max-md:flex-col">
          {[0, 1].map((slot) => (
            <div
              key={slot}
              className="flex min-w-0 flex-1 flex-col gap-1.5"
              dangerouslySetInnerHTML={{ __html: cols[slot] ? columnHTML(cols[slot]) : "" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
