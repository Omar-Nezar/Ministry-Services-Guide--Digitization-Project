import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { Braces, Check, Copy, GripVertical, Loader2, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Entry, Page, Column, Label } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { RichEditor } from "./RichEditor";
import { SaveIndicator } from "./SaveIndicator";
import { JsonDialog } from "./JsonDialog";
import { ColumnBox } from "./ColumnBox";

type Status = "idle" | "pending" | "saving" | "saved" | "error";

type Props = {
  page: Page;
  index: number;
  total: number;
  labels: Label[];
  onPageChange: (page: Page) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
};

const MIN_WIDTH = 20;
type Layout = "2" | "4" | "image";
const isCol = (id: unknown) => String(id).startsWith("c");
const num = (id: unknown) => Number(String(id).slice(1));

// Columns compete with columns; entries prefer the entry under the pointer, then the column under it.
const collision = (args: any) => {
  const cols = args.droppableContainers.filter((c: any) => isCol(c.id));
  const entries = args.droppableContainers.filter((c: any) => !isCol(c.id));
  if (isCol(args.active.id)) return closestCenter({ ...args, droppableContainers: cols });
  const hits = pointerWithin({ ...args, droppableContainers: entries });
  if (hits.length) return hits;
  const colHits = pointerWithin({ ...args, droppableContainers: cols });
  if (colHits.length) return colHits;
  return closestCorners({ ...args, droppableContainers: entries });
};

export function AdvancedPageEditor({ page, index, total, labels, onPageChange, onMove, onDelete }: Props) {
  const [columns, setColumns] = useState<Column[]>(page.columns);
  const [title, setTitle] = useState(page.title);
  const contents = useRef(new Map<number, string>());
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setColumns(page.columns);
    setTitle(page.title);
  }, [page]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (patch: Partial<Page>) => onPageChange({ ...page, ...patch, columns });

  const saveTitle = async () => {
    if (title.trim() && title !== page.title) update(await api.updatePage(page.id, { title: title.trim() }));
  };

  const layout: Layout = page.type === "image" ? "image" : columns.length >= 2 ? "4" : "2";

  const chooseLayout = async (next: Layout) => {
    if (next === layout) return;
    if (next === "image") return onPageChange(await api.updatePage(page.id, { type: "image" }));
    const pairs = next === "4" ? 2 : 1;
    if (pairs < columns.length && !confirm("سيتم نقل محتوى القسم الثاني إلى القسم الأول. متابعة؟")) return;
    let updated = page.type === "image" ? await api.updatePage(page.id, { type: "columns" }) : page;
    if (pairs !== updated.columns.length) updated = await api.setLayout(page.id, pairs);
    onPageChange(updated);
  };

  const persistColumns = (cols: Column[]) =>
    api.saveColumns(page.id, cols.map((c, i) => ({ id: c.id, order: i, width: c.width, labelWidth: c.labelWidth })));

  const trackDrag = (e: React.PointerEvent, boxWidth: number, onMove: (pct: number) => Column[], onDone: (cols: Column[]) => void) => {
    e.preventDefault();
    const startX = e.clientX;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    let latest = columns;
    const move = (ev: PointerEvent) => {
      latest = onMove((-(ev.clientX - startX) / boxWidth) * 100);
      setColumns(latest);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      onDone(latest);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  const startLabelResize = (i: number, e: React.PointerEvent, boxWidth: number) => {
    const start = columns[i].labelWidth;
    trackDrag(
      e,
      boxWidth,
      (pct) => {
        const lw = Math.round(Math.min(Math.max(start + pct, 15), 60) * 100) / 100;
        return columns.map((c, idx) => (idx === i ? { ...c, labelWidth: lw } : c));
      },
      persistColumns,
    );
  };

  const persistEntries = (cols: Column[]) =>
    api.arrangeEntries(cols.flatMap((c) => c.entries.map((e, i) => ({ id: e.id, columnId: c.id, order: i }))));

  const findColumn = (key: string) =>
    isCol(key) ? columns.find((c) => c.id === num(key)) : columns.find((c) => c.entries.some((e) => e.id === num(key)));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || isCol(active.id)) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from.id === to.id) return;
    setColumns((cols) => {
      const entry = from.entries.find((e) => e.id === num(active.id))!;
      return cols.map((c) => {
        if (c.id === from.id) return { ...c, entries: c.entries.filter((e) => e.id !== entry.id) };
        if (c.id === to.id) {
          const overIdx = isCol(over.id) ? c.entries.length : c.entries.findIndex((e) => e.id === num(over.id));
          const next = [...c.entries];
          next.splice(overIdx < 0 ? next.length : overIdx, 0, { ...entry, columnId: c.id });
          return { ...c, entries: next };
        }
        return c;
      });
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    if (isCol(active.id)) {
      const from = columns.findIndex((c) => c.id === num(active.id));
      const to = columns.findIndex((c) => c.id === num(over.id));
      if (from === to || to < 0) return;
      const next = arrayMove(columns, from, to);
      setColumns(next);
      persistColumns(next);
      return;
    }
    const col = findColumn(String(active.id));
    if (!col) return;
    let next = columns;
    if (!isCol(over.id)) {
      const from = col.entries.findIndex((e) => e.id === num(active.id));
      const to = col.entries.findIndex((e) => e.id === num(over.id));
      if (from !== to && to >= 0) {
        next = columns.map((c) => (c.id === col.id ? { ...c, entries: arrayMove(c.entries, from, to) } : c));
        setColumns(next);
      }
    }
    persistEntries(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">صفحة {index + 1}:</span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-56 font-semibold"
          aria-label="عنوان الصفحة"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">التخطيط:</span>
          <div className="flex rounded-md border p-0.5">
            <Tip label="عنوان | معلومات">
              <Button size="sm" variant={layout === "2" ? "secondary" : "ghost"} onClick={() => chooseLayout("2")}>
                <Columns2 /> عمودان
              </Button>
            </Tip>
            <Tip label="عنوان | معلومات — عنوان | معلومات">
              <Button size="sm" variant={layout === "4" ? "secondary" : "ghost"} onClick={() => chooseLayout("4")}>
                <Columns4 /> 4 أعمدة
              </Button>
            </Tip>
            <Tip label="صورة واحدة تملأ الصفحة">
              <Button size="sm" variant={layout === "image" ? "secondary" : "ghost"} onClick={() => chooseLayout("image")}>
                <ImageIcon /> صورة
              </Button>
            </Tip>
          </div>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <Tip label="نقل لأعلى">
            <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUp />
            </Button>
          </Tip>
          <Tip label="نقل لأسفل">
            <Button size="icon-sm" variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDown />
            </Button>
          </Tip>
          <Tip label="حذف الصفحة">
            <Button size="icon-sm" variant="ghost" className="hover:text-destructive" onClick={onDelete}>
              <Trash2 />
            </Button>
          </Tip>
        </div>
      </div>

      {page.type === "image" ? (
        <ImageEditor page={page} onPageChange={onPageChange} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={collision} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map((c) => `c${c.id}`)} strategy={rectSortingStrategy}>
            <div ref={rowRef} className="flex items-start">
              {columns.map((col, i) => (
                <ColumnBox
                  key={col.id}
                  column={col}
                  index={i}
                  isLast={i === columns.length - 1}
                  labels={labels}
                  onResizeStart={startResize}
                  onLabelResizeStart={startLabelResize}
                  onAddEntry={(columnId, labelId) => {
                    api.createEntry(columnId, labelId).then(entry => {
                      setColumns(cols => cols.map(c => c.id === columnId ? { ...c, entries: [...c.entries, entry] } : c));
                    });
                  }}
                >
                  <SortableContext items={col.entries.map((e) => `e${e.id}`)} strategy={verticalListSortingStrategy}>
                    {col.entries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        labelWidth={col.labelWidth}
                        content={contents.current.get(entry.id) ?? entry.content}
                        onContentChange={(id, json) => contents.current.set(id, json)}
                        onDelete={async (id) => {
                          await api.deleteEntry(id);
                          setColumns(cols => cols.map(c => ({ ...c, entries: c.entries.filter(e => e.id !== id) })));
                        }}
                      />
                    ))}
                  </SortableContext>
                </ColumnBox>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
