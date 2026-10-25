import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { EntryRow } from "./EntryRow";

type ColumnBoxProps = {
  column: any; // Will be typed as Column from types.ts
  index: number;
  isLast: boolean;
  labels: any[];
  onResizeStart: (i: number, e: React.PointerEvent) => void;
  onLabelResizeStart: (i: number, e: React.PointerEvent, boxWidth: number) => void;
  onAddEntry: (columnId: number, labelId: number) => void;
  children: React.ReactNode;
};

export function ColumnBox({ column, index, isLast, labels, onResizeStart, onLabelResizeStart, onAddEntry, children }: ColumnBoxProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `c${column.id}` });
  const tableRef = useRef<HTMLDivElement>(null);
  
  return (
    <div
      ref={setNodeRef}
      style={{ width: `${column.width}%`, transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative shrink-0 px-1.5", isDragging && "z-20 opacity-70")}
    >
      <div className="flex min-h-40 flex-col gap-2 rounded-xl border border-dashed bg-muted/40 p-2">
        <div className="flex items-center justify-between">
          <button
            className="inline-flex cursor-grab touch-none items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" /> القسم {index + 1}
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">{Math.round(column.width)}%</span>
        </div>
      </div>

      {/* Two sub-columns: labels | info. The header divider sets the label width for every row. */}
      <div ref={tableRef} className="flex flex-col gap-1.5">
        <div className="relative flex text-xs font-semibold text-muted-foreground">
          <div style={{ width: `max(${column.labelWidth}%, 6rem)` }} className="shrink-0 px-2">
            العنوان
          </div>
          <div className="flex-1 px-2">المعلومات</div>
          <div
            role="separator"
            aria-label="تغيير عرض عمود العناوين"
            onPointerDown={(e) => onLabelResizeStart(index, e, tableRef.current?.offsetWidth ?? 1)}
            style={{ insetInlineStart: `calc(max(${column.labelWidth}%, 6rem) - 6px)` }}
            className="absolute -inset-y-1 w-3 cursor-col-resize touch-none rounded bg-transparent hover:bg-primary/30"
          />
        </div>
        {children}
      </div>

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">التخطيط:</span>
          <div className="flex rounded-md border p-0.5">
            <Button size="sm" variant="ghost" className="px-1">
              <Columns2 />
            </Button>
          </div>
        </div>
      </div>

      {!isLast && (
        <div
          role="separator"
          onPointerDown={(e) => onResizeStart(index, e)}
          className="group absolute inset-y-0 -end-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center"
        >
          <span className="h-full w-0.5 rounded bg-transparent transition-colors group-hover:bg-primary/60" />
        </div>
      )}
    </div>
  );
}
