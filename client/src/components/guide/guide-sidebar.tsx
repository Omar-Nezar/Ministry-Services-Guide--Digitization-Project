import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useParams } from "react-router";
import { ChevronDown, Search, X } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { DEFAULT_LABEL_COLOR, divisionTitle, serviceTitle, type TreeDivision } from "@/lib/guide-api";
import { matches } from "@/lib/guide-search";
import { cn } from "@/lib/utils";
import { guidePaths } from "./paths";

interface Props {
  tree: TreeDivision[] | undefined;
  error: string | undefined;
  /** Called when a link is followed (closes the drawer on small screens) */
  onNavigate?: () => void;
}

/** Search box, then the tree: category > service names. Nothing else is listed under a service. */
export function GuideSidebar({ tree, error, onNavigate }: Props) {
  const { isArabic } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const params = useParams();

  const activeServiceId = params.serviceId ? Number(params.serviceId) : null;
  const activeDivisionId = useMemo(() => {
    if (params.divisionId) return Number(params.divisionId);
    return tree?.find((d) => d.services.some((s) => s.id === activeServiceId))?.id ?? null;
  }, [tree, params.divisionId, activeServiceId]);

  // keep the current category open
  useEffect(() => {
    if (activeDivisionId != null) setOpen((o) => new Set(o).add(activeDivisionId));
  }, [activeDivisionId]);

  // "/" jumps to the search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !(document.activeElement as HTMLElement | null)?.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    if (!tree) return [];
    if (!searching) return tree;
    return tree
      .map((d) =>
        matches(`${d.nameAr ?? ""} ${d.name}`, query)
          ? d
          : { ...d, services: d.services.filter((s) => matches(s.name, query)) },
      )
      .filter((d) => d.services.length > 0);
  }, [tree, query, searching]);
  const found = visible.reduce((n, d) => n + d.services.length, 0);

  const toggle = (id: number) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const placeholder = isArabic ? "ابحث عن خدمة…" : "Search services…";

  return (
    <div className="flex h-full flex-col py-2">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-lg border bg-card ps-9 pe-9 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
        />
        {searching ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={isArabic ? "مسح" : "Clear"}
            className="absolute end-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : (
          <kbd className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
            /
          </kbd>
        )}
      </div>
      {searching && (
        <p className="mt-2 px-1 text-xs text-muted-foreground" aria-live="polite">
          {found
            ? isArabic
              ? `${found} خدمة مطابقة`
              : `${found} matching service${found === 1 ? "" : "s"}`
            : isArabic
              ? "لا توجد خدمات مطابقة"
              : "No matching services"}
        </p>
      )}

      <nav className="-me-2 mt-4 flex-1 overflow-y-auto pe-2" aria-label={isArabic ? "الخدمات" : "Services"}>
        {error && (
          <p className="px-2 text-sm text-destructive">
            {isArabic ? "تعذر تحميل الخدمات." : "Unable to load the services."}
          </p>
        )}
        {!tree && !error && <TreeSkeleton />}
        <ul className="space-y-1">
          {visible.map((d) => {
            const isOpen = searching || open.has(d.id);
            const isActive = d.id === activeDivisionId;
            return (
              <li key={d.id}>
                <div className={cn("group flex items-center rounded-lg transition-colors hover:bg-muted", isActive && "bg-accent")}>
                  <NavLink
                    to={guidePaths.division(d.id)}
                    onClick={onNavigate}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-sm font-medium"
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-1 shrink-0 rounded-full"
                      style={{ background: d.color ?? DEFAULT_LABEL_COLOR }}
                    />
                    <span className="truncate">{divisionTitle(d, isArabic)}</span>
                    <span className="ms-auto text-xs font-normal text-muted-foreground tabular-nums">{d.services.length}</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => toggle(d.id)}
                    aria-label={isOpen ? (isArabic ? "طي" : "Collapse") : isArabic ? "توسيع" : "Expand"}
                    aria-expanded={isOpen}
                    className="me-1 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-background"
                  >
                    <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", !isOpen && "ltr:-rotate-90 rtl:rotate-90")} />
                  </button>
                </div>

                {isOpen && (
                  <ul className="ms-5 mt-1 mb-2 space-y-0.5 border-s ps-2">
                    {d.services.map((s) => (
                      <li key={s.id}>
                        <NavLink
                          to={guidePaths.service(s.id)}
                          onClick={onNavigate}
                          title={serviceTitle(s.name)}
                          className={({ isActive: current }) =>
                            cn(
                              "relative block rounded-md px-2 py-1.5 text-[13px] leading-relaxed text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                              current &&
                                "bg-primary/8 font-medium text-primary before:absolute before:inset-y-1 before:-start-[9px] before:w-0.5 before:rounded-full before:bg-primary hover:bg-primary/10 hover:text-primary",
                            )
                          }
                        >
                          <span className="line-clamp-2">{serviceTitle(s.name)}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
