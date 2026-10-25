import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { Braces, Check, Copy, GripVertical, Loader2, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Entry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { RichEditor } from "./RichEditor";

type Status = "idle" | "pending" | "saving" | "saved" | "error";

type Props = {
  entry: Entry;
  /** % of the row taken by the label cell */
  labelWidth: number;
  /** Latest content (may be newer than entry.content if edited before a remount). */
  content: string;
  onContentChange: (id: number, json: string) => void;
  onDelete: (id: number) => void;
};

export function EntryRow({ entry, labelWidth, content, onContentChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `e${entry.id}` });
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);

  const save = async () => {
    const json = pending.current;
    if (json == null) return;
    pending.current = null;
    setStatus("saving");
    try {
      await api.updateEntry(entry.id, json);
      setStatus(pending.current == null ? "saved" : "pending");
    } catch {
      setStatus("error");
    }
  };

  const [showJson, setShowJson] = useState(false);
  const latest = useRef(content);

  const handleChange = (json: string) => {
    latest.current = json;
    onContentChange(entry.id, json);
    pending.current = json;
    setStatus("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 1000);
  };

  // Flush unsaved text if the row unmounts (e.g. moved to another column)
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pending.current != null) api.updateEntry(entry.id, pending.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const color = entry.label.color ?? "#64748b";

  // One table row: label cell first (right side in RTL), info cell next to it
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex overflow-hidden rounded-lg border bg-card shadow-xs",
        isDragging && "z-10 opacity-60 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <div
        style={{ width: `max(${labelWidth}%, 6rem)`, background: `color-mix(in srgb, ${color} 8%, white)`, borderInlineStartColor: color }}
        className="flex shrink-0 flex-col justify-between gap-2 border-e border-s-4 p-2"
      >
        <div className="flex items-start gap-1.5">
          <button
            className="mt-0.5 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground"
            aria-label="سحب"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="min-w-0 text-sm font-bold" style={{ color }}>
            {entry.label.name}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <SaveIndicator status={status} />
          <Tip label="عرض JSON">
            <Button size="icon" variant="ghost" className="ms-auto size-6" onClick={() => setShowJson(true)}>
              <Braces className="size-3.5" />
            </Button>
          </Tip>
          <Tip label="حذف السطر">
            <Button size="icon" variant="ghost" className="size-6 hover:text-destructive" onClick={() => onDelete(entry.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          </Tip>
        </div>
      </div>
      <div className="min-w-0 flex-1 p-1.5">
        <RichEditor content={content} onChange={handleChange} />
      </div>
      {showJson && <JsonDialog title={entry.label.name} json={latest.current} onClose={() => setShowJson(false)} />}
    </div>
  );
}

/** Read-only popup showing the Tiptap JSON stored for an entry */
function JsonDialog({ title, json, onClose }: { title: string; json: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  let pretty = "";
  try {
    pretty = json ? JSON.stringify(JSON.parse(json), null, 2) : "";
  } catch {
    pretty = json;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(pretty);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`JSON: ${title}`}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 rounded-xl border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h3 className="flex-1 font-semibold">Tiptap JSON — {title}</h3>
          <Button size="sm" variant="outline" onClick={copy} disabled={!pretty}>
            {copied ? <Check /> : <Copy />} {copied ? "تم النسخ" : "نسخ"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="إغلاق">
            <X />
          </Button>
        </div>
        <pre dir="ltr" className="flex-1 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs leading-5">
          {pretty || "// لا يوجد محتوى بعد (empty)"}
        </pre>
      </div>
    </div>,
    document.body,
  );
}

function SaveIndicator({ status }: { status: Status }) {
  if (status === "idle") return null;
  if (status === "error") return <span className="text-xs text-destructive">فشل الحفظ</span>;
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Check className="size-3" /> تم الحفظ
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className={cn("size-3", status === "saving" && "animate-spin")} /> {status === "saving" ? "جارٍ الحفظ" : "تعديلات غير محفوظة"}
    </span>
  );
}
