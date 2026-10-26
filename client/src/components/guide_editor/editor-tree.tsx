import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tip } from "@/components/ui/tip";
import { DEFAULT_LABEL_COLOR, apiErrorMessage, divisionTitle, editorApi, serviceTitle, type EditorDivision } from "@/lib/guide-api";
import { matches } from "@/lib/guide-search";
import { cn } from "@/lib/utils";
import { editorPaths } from "./editor-layout";

type Props = {
  tree: EditorDivision[] | undefined;
  error: boolean;
  setTree: (update: (tree: EditorDivision[]) => EditorDivision[]) => void;
  reloadTree: () => Promise<void>;
  isAdmin: boolean;
  onNavigate: () => void;
};

const divisionDragId = (id: number) => `d-${id}`;
const serviceDragId = (id: number) => `s-${id}`;

/**
 * Categories and their services. Drag a service to reorder it (or onto another category), add, rename and delete
 * services in the categories you may edit. Only admins reorder the categories themselves.
 */
export function EditorTree({ tree, error, setTree, reloadTree, isAdmin, onNavigate }: Props) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeId = Number(matchPath("/moh/editor/service/:id", pathname)?.params.id) || null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [renaming, setRenaming] = useState<number | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // keep the category of the open service expanded
  const activeDivisionId = tree?.find((d) => d.services.some((s) => s.id === activeId))?.id;
  useEffect(() => {
    if (activeDivisionId != null) setOpen((o) => (o.has(activeDivisionId) ? o : new Set(o).add(activeDivisionId)));
  }, [activeDivisionId]);

  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    if (!tree) return [];
    if (!searching) return tree;
    return tree
      .map((d) => (matches(`${d.nameAr ?? ""} ${d.name}`, query) ? d : { ...d, services: d.services.filter((s) => matches(s.name, query)) }))
      .filter((d) => d.services.length > 0);
  }, [tree, query, searching]);

  const fail = async (e: unknown) => {
    alert(apiErrorMessage(e, t("تعذر حفظ التغيير.", "Unable to save the change.")));
    await reloadTree();
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!tree || !over || active.id === over.id) return;
    const from = String(active.id);
    const to = String(over.id);
    const divisionOfService = (id: number) => tree.find((d) => d.services.some((s) => s.id === id));

    if (from.startsWith("d-")) {
      if (!isAdmin) return;
      const target = to.startsWith("d-") ? Number(to.slice(2)) : divisionOfService(Number(to.slice(2)))?.id;
      const fromIndex = tree.findIndex((d) => d.id === Number(from.slice(2)));
      const toIndex = tree.findIndex((d) => d.id === target);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const next = arrayMove(tree, fromIndex, toIndex);
      setTree(() => next);
      try {
        await editorApi.reorderDivisions(next.map((d) => d.id));
      } catch (e) {
        await fail(e);
      }
      return;
    }

    const serviceId = Number(from.slice(2));
    const source = divisionOfService(serviceId);
    const target = to.startsWith("d-") ? tree.find((d) => d.id === Number(to.slice(2))) : divisionOfService(Number(to.slice(2)));
    if (!source || !target || !source.editable || !target.editable) return;

    const moving = source.services.find((s) => s.id === serviceId)!;
    const overId = to.startsWith("s-") ? Number(to.slice(2)) : null;
    let nextSource = source.services.filter((s) => s.id !== serviceId);
    let nextTarget: typeof target.services;
    if (source.id === target.id) {
      const list = source.services;
      const fromIndex = list.findIndex((s) => s.id === serviceId);
      const toIndex = overId == null ? list.length - 1 : list.findIndex((s) => s.id === overId);
      nextTarget = arrayMove(list, fromIndex, toIndex);
      nextSource = nextTarget;
    } else {
      const at = overId == null ? target.services.length : target.services.findIndex((s) => s.id === overId);
      nextTarget = [...target.services.slice(0, at), moving, ...target.services.slice(at)];
    }

    setTree((current) =>
      current.map((d) => (d.id === target.id ? { ...d, services: nextTarget } : d.id === source.id ? { ...d, services: nextSource } : d)),
    );
    if (source.id !== target.id) setOpen((o) => new Set(o).add(target.id));

    const changed = source.id === target.id ? [target] : [source, target];
    const lists = new Map([[target.id, nextTarget], [source.id, nextSource]]);
    try {
      await editorApi.arrangeServices(
        changed.flatMap((d) => lists.get(d.id)!.map((s, order) => ({ id: s.id, serviceDivisionId: d.id, order }))),
      );
    } catch (e) {
      await fail(e);
    }
  };

  const addService = async (divisionId: number, name: string) => {
    setAdding(null);
    if (!name.trim()) return;
    try {
      const created = await editorApi.createService(divisionId, name.trim());
      await reloadTree();
      navigate(editorPaths.service(created.id));
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر إضافة الخدمة.", "Unable to add the service.")));
    }
  };

  const rename = async (id: number, name: string) => {
    setRenaming(null);
    const next = name.trim();
    if (!next) return;
    try {
      await editorApi.renameService(id, next);
      setTree((current) => current.map((d) => ({ ...d, services: d.services.map((s) => (s.id === id ? { ...s, name: next } : s)) })));
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر إعادة التسمية.", "Unable to rename the service.")));
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(t(`حذف الخدمة "${serviceTitle(name)}" بكل محتواها؟`, `Delete "${serviceTitle(name)}" and all its content?`))) return;
    try {
      await editorApi.deleteService(id);
      if (id === activeId) navigate(editorPaths.home);
      await reloadTree();
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر الحذف.", "Unable to delete the service.")));
    }
  };

  const toggle = (id: number) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const placeholder = t("ابحث عن خدمة…", "Search services…");

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 ps-9" />
      </div>

      {error && <p className="px-1 text-sm text-destructive">{t("تعذر تحميل الخدمات.", "Unable to load the services.")}</p>}
      {!tree && !error && (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((d) => divisionDragId(d.id))} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1">
            {visible.map((d) => (
              <DivisionBlock key={d.id} id={divisionDragId(d.id)} draggable={isAdmin && !searching}>
                {(grip) => (
                  <>
                    <div className="group flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted">
                      {grip}
                      <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full" style={{ background: d.color ?? DEFAULT_LABEL_COLOR }} />
                      <button
                        type="button"
                        onClick={() => toggle(d.id)}
                        aria-expanded={searching || open.has(d.id)}
                        className="flex min-w-0 flex-1 items-center gap-1 py-1 text-start text-sm font-medium"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !searching && !open.has(d.id) && "ltr:-rotate-90 rtl:rotate-90")}
                        />
                        <span className="truncate">{divisionTitle(d, isArabic)}</span>
                        <span className="ms-auto text-xs font-normal text-muted-foreground tabular-nums">{d.services.length}</span>
                      </button>
                      {d.editable && (
                        <Tip label={t("إضافة خدمة", "Add a service")}>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("إضافة خدمة", "Add a service")}
                            onClick={() => {
                              setOpen((o) => new Set(o).add(d.id));
                              setAdding(d.id);
                            }}
                          >
                            <Plus />
                          </Button>
                        </Tip>
                      )}
                    </div>

                    {(searching || open.has(d.id)) && (
                      <SortableContext items={d.services.map((s) => serviceDragId(s.id))} strategy={verticalListSortingStrategy}>
                        <ul className="ms-5 mt-0.5 mb-2 space-y-0.5 border-s ps-2">
                          {adding === d.id && (
                            <li>
                              <Input
                                autoFocus
                                placeholder={t("اسم الخدمة الجديدة", "New service name")}
                                aria-label={t("اسم الخدمة الجديدة", "New service name")}
                                className="h-8"
                                onBlur={(e) => void addService(d.id, e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") setAdding(null);
                                }}
                              />
                            </li>
                          )}
                          {d.services.map((s) => (
                            <ServiceRow
                              key={s.id}
                              id={serviceDragId(s.id)}
                              name={s.name}
                              active={s.id === activeId}
                              editable={d.editable}
                              draggable={d.editable && !searching}
                              renaming={renaming === s.id}
                              to={editorPaths.service(s.id)}
                              onNavigate={onNavigate}
                              onStartRename={() => setRenaming(s.id)}
                              onRename={(name) => void rename(s.id, name)}
                              onDelete={() => void remove(s.id, s.name)}
                            />
                          ))}
                        </ul>
                      </SortableContext>
                    )}
                  </>
                )}
              </DivisionBlock>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {tree && visible.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">{t("لا توجد خدمات مطابقة.", "No matching services.")}</p>
      )}
      {tree && !searching && (
        <p className="px-1 text-[11px] leading-5 text-muted-foreground">
          {t(
            "اسحب الخدمة لإعادة ترتيبها أو لنقلها إلى مجال آخر، وانقر مرتين على الاسم لإعادة تسميتها.",
            "Drag a service to reorder it or move it to another category; double-click a name to rename it.",
          )}
        </p>
      )}
    </div>
  );
}

function DivisionBlock({
  id,
  draggable,
  children,
}: {
  id: string;
  draggable: boolean;
  children: (grip: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: { draggable: !draggable } });
  const grip = draggable ? (
    <button type="button" className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground" aria-label="Drag" {...attributes} {...listeners}>
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  ) : null;

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(isDragging && "z-10 opacity-60")}>
      {children(grip)}
    </li>
  );
}

type RowProps = {
  id: string;
  name: string;
  to: string;
  active: boolean;
  editable: boolean;
  draggable: boolean;
  renaming: boolean;
  onNavigate: () => void;
  onStartRename: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function ServiceRow(p: RowProps) {
  const { isArabic } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled: !p.draggable });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(isDragging && "z-10 opacity-60")}>
      <div className={cn("group flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] transition-colors", p.active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>
        {p.draggable && (
          <button type="button" className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground" aria-label={isArabic ? "سحب" : "Drag"} {...attributes} {...listeners}>
            <GripVertical aria-hidden="true" className="size-3.5" />
          </button>
        )}
        {p.renaming ? (
          <Input
            autoFocus
            defaultValue={p.name}
            className="h-7 px-2"
            onBlur={(e) => p.onRename(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") p.onRename("");
            }}
          />
        ) : (
          <Link
            to={p.to}
            onClick={p.onNavigate}
            onDoubleClick={p.editable ? p.onStartRename : undefined}
            title={serviceTitle(p.name)}
            className="min-w-0 flex-1 py-1 leading-relaxed"
          >
            <span className="line-clamp-2">{serviceTitle(p.name)}</span>
          </Link>
        )}
        {p.editable && !p.renaming && (
          <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <Tip label={isArabic ? "إعادة تسمية" : "Rename"}>
              <Button type="button" size="icon-sm" variant="ghost" className="size-6" aria-label={isArabic ? "إعادة تسمية" : "Rename"} onClick={p.onStartRename}>
                <Pencil className="size-3.5" />
              </Button>
            </Tip>
            <Tip label={isArabic ? "حذف" : "Delete"}>
              <Button type="button" size="icon-sm" variant="ghost" className="size-6 hover:text-destructive" aria-label={isArabic ? "حذف" : "Delete"} onClick={p.onDelete}>
                <Trash2 className="size-3.5" />
              </Button>
            </Tip>
          </div>
        )}
      </div>
    </li>
  );
}
