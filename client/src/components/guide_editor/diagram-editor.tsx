import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Link2, Minus, Plus, Redo2, Trash2, Undo2, Upload } from "lucide-react";
import { editorApi, type EditorFlowchart } from "@/lib/guide-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawing } from "@/components/flowchart/copy-canvas";
import { exportDiagramXlsx } from "@/components/flowchart/export-xlsx";
import {
  SHAPE_KINDS, SNAP, bodyTop, laneAt, laneLeft, makeLane, makeLine, makeShape, makeText, normalize, parseDoc, relayout, sheetsOf, snap, uid,
  type ShapeKind,
} from "@/components/flowchart/diagram";
import type { CopyDoc, CopyLane, CopyLine, CopyShape } from "@/components/flowchart/types";

const HANDLES: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]];
const MIN = 30;

/**
 * Draws a flowchart with swimlanes in the same JSON shape as the Flowchart table (cells + shapes + connectors),
 * the way the Excel diagrams are drawn. With a shape selected, the next shape is placed under it and joined with an arrow.
 */
export function DiagramEditor({ flowchart, onDirty }: { flowchart: EditorFlowchart; onDirty: (key: string, save: () => Promise<unknown>) => void }) {
  const [doc, setDocState] = useState<CopyDoc>(() => parseDoc(flowchart.json, flowchart.title ?? ""));
  const docRef = useRef(doc);
  const svgRef = useRef<SVGSVGElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | undefined>();
  const [connecting, setConnecting] = useState<string | null | false>(false); // false = off, null = pick source, id = pick target
  const [zoom, setZoom] = useState(0.8);
  /** Scale that shows the whole width of the drawing in the canvas */
  const fit = (d: CopyDoc) => {
    const w = scroller.current?.clientWidth;
    if (w) setZoom(Math.max(0.2, Math.min(1, +((w - 4) / d.width).toFixed(2))));
  };
  const [title, setTitle] = useState(flowchart.title ?? "");
  const titleRef = useRef(title);
  const [sheets, setSheets] = useState<{ name: string; doc: CopyDoc }[] | null>(null);
  const undo = useRef<CopyDoc[]>([]);
  const redo = useRef<CopyDoc[]>([]);
  const lastEdit = useRef({ key: "", t: 0 });

  const setDoc = (d: CopyDoc) => {
    docRef.current = d;
    setDocState(d);
  };

  // Nothing is stored until the page's Save button runs this, with the drawing and title as they are then
  const scheduleSave = () =>
    onDirty(`flowchart-${flowchart.id}`, () =>
      editorApi.updateFlowchart(flowchart.id, { json: JSON.stringify(docRef.current), title: titleRef.current.trim() }),
    );

  useEffect(() => {
    // Arabic diagrams start at their right edge
    fit(docRef.current);
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Applies a finished change: normalises, remembers the previous state for undo, saves. */
  const commit = (next: CopyDoc, before: CopyDoc, coalesce?: string) => {
    const now = Date.now();
    const same = coalesce && lastEdit.current.key === coalesce && now - lastEdit.current.t < 1200;
    lastEdit.current = { key: coalesce ?? "", t: now };
    if (!same) {
      undo.current = [...undo.current.slice(-49), before];
      redo.current = [];
    }
    setDoc(normalize(next));
    scheduleSave();
  };

  const edit = (fn: (d: CopyDoc) => CopyDoc, coalesce?: string) => commit(fn(structuredClone(docRef.current)), docRef.current, coalesce);

  const stepHistory = (from: typeof undo, to: typeof redo) => {
    const prev = from.current.pop();
    if (!prev) return;
    to.current.push(docRef.current);
    setDoc(prev);
    setSel(undefined);
    scheduleSave();
  };

  const shape = sel?.startsWith("s:") ? doc.shapes.find((s) => s.id === sel.slice(2)) : undefined;
  const line = sel?.startsWith("l:") ? doc.lines.find((l) => l.id === sel.slice(2)) : undefined;

  const remove = () => {
    if (shape) {
      edit((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== shape.id), lines: d.lines.filter((l) => l.from !== shape.id && l.to !== shape.id) }));
    } else if (line) {
      edit((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== line.id) }));
    } else return;
    setSel(undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        remove();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        stepHistory(e.shiftKey ? redo : undo, e.shiftKey ? undo : redo);
      } else if (e.key === "Escape") setConnecting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- pointer gestures ---------------------------------------------------------------
  const toDoc = (e: { clientX: number; clientY: number }): [number, number] => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [q.x, q.y];
  };

  const gesture = (e: React.PointerEvent, apply: (dx: number, dy: number, base: CopyDoc) => CopyDoc) => {
    e.preventDefault();
    e.stopPropagation();
    const start = toDoc(e);
    const base = docRef.current;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const p = toDoc(ev);
      const dx = p[0] - start[0], dy = p[1] - start[1];
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      setDoc(normalize(apply(dx, dy, structuredClone(base))));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (moved) commit(docRef.current, base);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onShapeDown = (id: string, e: React.PointerEvent) => {
    if (connecting !== false) {
      e.stopPropagation();
      if (connecting === null) return setConnecting(id);
      if (connecting !== id) {
        const l = makeLine(connecting, id);
        edit((d) => ({ ...d, lines: [...d.lines, l] }));
        setSel(`l:${l.id}`);
      }
      return setConnecting(false);
    }
    setSel(`s:${id}`);
    gesture(e, (dx, dy, d) => {
      const s = d.shapes.find((x) => x.id === id)!;
      s.x = Math.max(0, snap(s.x + dx));
      s.y = Math.max(0, snap(s.y + dy));
      return d;
    });
  };

  const onResizeDown = (id: string, [hx, hy]: [number, number], e: React.PointerEvent) =>
    gesture(e, (dx, dy, d) => {
      const s = d.shapes.find((x) => x.id === id)!;
      const { x, y, w, h } = s;
      if (hx) s.w = Math.max(MIN, snap(w + dx));
      else { s.w = Math.max(MIN, snap(w - dx)); s.x = x + w - s.w; }
      if (hy) s.h = Math.max(MIN, snap(h + dy));
      else { s.h = Math.max(MIN, snap(h - dy)); s.y = y + h - s.h; }
      return d;
    });

  // ---- adding -------------------------------------------------------------------------
  const addShape = (k: ShapeKind) => {
    const d = structuredClone(docRef.current);
    const from = shape;
    const s = makeShape(k, 0, 0);
    if (from) {
      s.x = from.x + from.w / 2 - s.w / 2;
      s.y = snap(from.y + from.h + 50);
    } else {
      // free: centred in the first lane (the right-most one), under the last shape there
      const lanes = d.lanes ?? [];
      const cx = lanes.length ? laneLeft(lanes, 0) + lanes[0].w / 2 : d.width / 2;
      const inLane = d.shapes.filter((x) => !lanes.length || laneAt(lanes, x.x + x.w / 2) === 0);
      s.x = snap(Math.max(0, cx - s.w / 2));
      s.y = inLane.length ? snap(Math.max(...inLane.map((x) => x.y + x.h)) + 50) : snap(bodyTop(d) + 30);
    }
    d.shapes.push(s);
    if (from && k.key !== "yes" && k.key !== "no" && k.key !== "text" && k.key !== "note") d.lines.push(makeLine(from.id, s.id));
    commit(d, docRef.current);
    setSel(`s:${s.id}`);
  };

  const duplicate = () => {
    if (!shape) return;
    const copy: CopyShape = { ...structuredClone(shape), id: `s${uid()}`, x: shape.x + 30, y: shape.y + 30 };
    edit((d) => ({ ...d, shapes: [...d.shapes, copy] }));
    setSel(`s:${copy.id}`);
  };

  const patchShape = (patch: Partial<CopyShape>, coalesce?: string) =>
    shape && edit((d) => ({ ...d, shapes: d.shapes.map((s) => (s.id === shape.id ? { ...s, ...patch } : s)) }), coalesce);

  const patchLine = (patch: Partial<CopyLine>) =>
    line && edit((d) => ({ ...d, lines: d.lines.map((l) => (l.id === line.id ? { ...l, ...patch } : l)) }));

  const para = shape?.text?.paras[0];
  const patchText = (patch: Partial<NonNullable<typeof para>>) =>
    shape?.text && patchShape({ text: { ...shape.text, paras: shape.text.paras.map((p) => ({ ...p, ...patch })) } }, "text-style");

  // ---- swimlanes / header lines -------------------------------------------------------
  const lanes = doc.lanes;
  const setLanes = (fn: (l: CopyLane[]) => CopyLane[], coalesce?: string) =>
    edit((d) => relayout(d, fn(d.lanes ?? [])), coalesce);
  const patchLane = (id: string, patch: Partial<CopyLane>, coalesce?: string) =>
    setLanes((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)), coalesce);
  const moveLane = (i: number, dir: -1 | 1) =>
    setLanes((ls) => {
      const next = [...ls];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });

  const importSheet = (d: CopyDoc) => {
    const next = structuredClone(d);
    next.title = next.title ?? "";
    commit(normalize(next), docRef.current);
    setSel(undefined);
    setSheets(null);
    fit(docRef.current);
    requestAnimationFrame(() => scroller.current && (scroller.current.scrollLeft = scroller.current.scrollWidth));
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      const list = sheetsOf(JSON.parse(await file.text()));
      if (!list.length) return alert("لا يوجد مخطط في هذا الملف.");
      if (list.length === 1 && (!docRef.current.shapes.length || confirm("استبدال المخطط الحالي؟"))) return importSheet(list[0].doc);
      setSheets(list);
    } catch {
      alert("تعذر قراءة الملف.");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            titleRef.current = e.target.value;
            scheduleSave();
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="عنوان المخطط"
          aria-label="عنوان المخطط"
          className="max-w-xs font-semibold"
        />
        <div className="ms-auto flex items-center gap-1">
          <Button render={<label className="cursor-pointer" />} nativeButton={false} size="sm" variant="outline">
            <Upload /> استيراد مخطط (JSON)
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                readFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!doc.shapes.length}
            onClick={() => exportDiagramXlsx(docRef.current, titleRef.current.trim()).catch(() => alert("تعذر تصدير الملف."))}
          >
            <Download /> تصدير Excel
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="تراجع" disabled={!undo.current.length} onClick={() => stepHistory(undo, redo)}>
            <Undo2 />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="إعادة" disabled={!redo.current.length} onClick={() => stepHistory(redo, undo)}>
            <Redo2 />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => fit(docRef.current)}>
            ملاءمة
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="تصغير" onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(1)))}>
            <Minus />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button size="icon-sm" variant="ghost" aria-label="تكبير" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}>
            <Plus />
          </Button>
        </div>
      </div>

      {sheets && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-sm">
          <span className="text-muted-foreground">اختر المخطط المراد استيراده:</span>
          {sheets.map((s) => (
            <Button key={s.name} size="sm" variant="outline" onClick={() => importSheet(s.doc)}>
              {s.name}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSheets(null)}>
            إلغاء
          </Button>
        </div>
      )}

      {/* Palette: the shapes the Excel diagrams use */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 p-1.5">
        {SHAPE_KINDS.map((k) => (
          <Button key={k.key} size="sm" variant="outline" onClick={() => addShape(k)}>
            <span
              className="size-3.5 shrink-0 border"
              style={{
                background: k.fill === "none" ? "transparent" : k.fill,
                borderColor: k.stroke === "none" ? "#cbd5e1" : k.stroke,
                borderRadius: k.prst === "ellipse" || k.prst === "flowChartConnector" ? 999 : k.prst === "roundRect" ? 4 : 1,
                transform: k.prst === "diamond" ? "rotate(45deg) scale(.8)" : undefined,
              }}
            />
            {k.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={connecting === false ? "outline" : "default"}
          onClick={() => setConnecting(connecting === false ? null : false)}
        >
          <Link2 /> {connecting === false ? "ربط بسهم" : connecting === null ? "اختر الشكل الأول…" : "اختر الشكل الثاني…"}
        </Button>
        <span className="ms-auto text-xs text-muted-foreground">
          {shape ? "الشكل الجديد يُضاف تحت الشكل المحدد ويُربط به بسهم" : "حدد شكلاً ثم أضف التالي ليرتبط به تلقائياً"}
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start">
        {/* Canvas */}
        <div ref={scroller} className="max-h-[75vh] min-w-0 flex-1 overflow-auto rounded-lg border bg-muted/30" dir="ltr">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${doc.width} ${doc.height}`}
            width={doc.width * zoom}
            height={doc.height * zoom}
            className={cn("block touch-none select-none", connecting !== false && "cursor-crosshair")}
          >
            <defs>
              <pattern id="grid" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                <path d={`M${SNAP},0H0V${SNAP}`} fill="none" stroke="#00000010" strokeWidth={1} />
              </pattern>
            </defs>
            <Drawing
              doc={doc}
              sel={sel}
              onShapeDown={onShapeDown}
              onLineDown={(id, e) => {
                e.stopPropagation();
                setSel(`l:${id}`);
              }}
              onBgDown={() => {
                setSel(undefined);
                setConnecting(false);
              }}
            />
            <rect width={doc.width} height={doc.height} fill="url(#grid)" pointerEvents="none" />
            {shape &&
              HANDLES.map(([hx, hy]) => (
                <rect
                  key={`${hx}${hy}`}
                  x={shape.x + hx * shape.w - 6}
                  y={shape.y + hy * shape.h - 6}
                  width={12}
                  height={12}
                  rx={2}
                  fill="#fff"
                  stroke="#2563eb"
                  strokeWidth={2}
                  style={{ cursor: hx === hy ? "nwse-resize" : "nesw-resize" }}
                  onPointerDown={(e) => onResizeDown(shape.id, [hx, hy], e)}
                />
              ))}
          </svg>
        </div>

        {/* Inspector */}
        <aside className="flex w-full shrink-0 flex-col gap-3 rounded-lg border p-3 text-sm lg:w-72">
          {shape && (
            <>
              <Field label="النص (سطر لكل فقرة)">
                <textarea
                  value={shape.text?.paras.map((p) => p.text).join("\n") ?? ""}
                  onChange={(e) => patchShape({ text: makeText(e.target.value, undefined, shape.text) }, "text")}
                  rows={4}
                  className="w-full resize-y rounded-md border bg-card px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </Field>
              <div className="flex items-end gap-2">
                <Field label="حجم الخط">
                  <Input
                    type="number"
                    min={8}
                    max={60}
                    value={Math.round(para?.size ?? 18)}
                    onChange={(e) => patchText({ size: Math.min(60, Math.max(8, Number(e.target.value) || 18)) })}
                    className="h-8 w-20"
                  />
                </Field>
                <Button size="sm" variant={para?.bold ? "secondary" : "outline"} onClick={() => patchText({ bold: !para?.bold })}>
                  <b>B</b>
                </Button>
                <ColorInput label="لون النص" value={para?.color ?? "#000000"} onChange={(c) => patchText({ color: c })} />
              </div>
              <div className="flex items-end gap-3">
                <ColorInput label="التعبئة" value={shape.fill === "none" ? "#ffffff" : shape.fill} onChange={(c) => patchShape({ fill: c }, "fill")} />
                <ColorInput label="الإطار" value={shape.stroke === "none" ? "#000000" : shape.stroke} onChange={(c) => patchShape({ stroke: c }, "stroke")} />
                <Field label="سماكة الإطار">
                  <Input type="number" min={0.5} max={8} step={0.5} value={shape.strokeW} onChange={(e) => patchShape({ strokeW: Number(e.target.value) || 1 }, "sw")} className="h-8 w-16" />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={duplicate}>
                  <Copy /> نسخ
                </Button>
                <Button size="sm" variant="outline" className="hover:text-destructive" onClick={remove}>
                  <Trash2 /> حذف
                </Button>
              </div>
            </>
          )}

          {line && (
            <>
              <Field label="شكل السهم">
                <div className="flex gap-1">
                  {(["elbow", "straight", "curve"] as const).map((r) => (
                    <Button key={r} size="sm" variant={line.route === r ? "secondary" : "outline"} onClick={() => patchLine({ route: r })} disabled={!(line.from && line.to)}>
                      {{ elbow: "زاوية", straight: "مستقيم", curve: "منحنى" }[r]}
                    </Button>
                  ))}
                </div>
              </Field>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant={line.tail ? "secondary" : "outline"} onClick={() => patchLine({ tail: !line.tail })}>
                  رأس السهم في النهاية
                </Button>
                <Button size="sm" variant={line.head ? "secondary" : "outline"} onClick={() => patchLine({ head: !line.head })}>
                  رأس السهم في البداية
                </Button>
                <Button size="sm" variant={line.dash ? "secondary" : "outline"} onClick={() => patchLine({ dash: line.dash ? undefined : "6 4" })}>
                  متقطع
                </Button>
              </div>
              <div className="flex items-end gap-3">
                <ColorInput label="اللون" value={line.color} onChange={(c) => patchLine({ color: c })} />
                <Field label="السماكة">
                  <Input type="number" min={1} max={8} step={0.5} value={line.width} onChange={(e) => patchLine({ width: Number(e.target.value) || 2 })} className="h-8 w-20" />
                </Field>
              </div>
              {!(line.from && line.to) && <p className="text-xs text-muted-foreground">هذا السهم من الرسم المستورد: يمكن تغيير شكله وحذفه، أما مساره فمحفوظ كما في الأصل.</p>}
              <Button size="sm" variant="outline" className="self-start hover:text-destructive" onClick={remove}>
                <Trash2 /> حذف السهم
              </Button>
            </>
          )}

          {!shape && !line && (
            <>
              <Field label="عنوان المخطط (أعلى المسارات)">
                <Input value={doc.title ?? ""} onChange={(e) => edit((d) => ({ ...d, title: e.target.value }), "title")} className="h-8" disabled={!lanes} />
              </Field>
              <Field label="مسار الخدمة / الإجراء">
                <Input value={doc.path ?? ""} onChange={(e) => edit((d) => ({ ...d, path: e.target.value }), "path")} className="h-8" disabled={!lanes} />
              </Field>
              <Field label="الوقت المستغرق لإنجاز الخدمة">
                <Input value={doc.time ?? ""} onChange={(e) => edit((d) => ({ ...d, time: e.target.value }), "time")} className="h-8" disabled={!lanes} />
              </Field>

              {lanes ? (
                <div className="flex flex-col gap-2 border-t pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground">المسارات (الأول من اليمين)</h4>
                  {lanes.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-1">
                      <input
                        type="color"
                        value={l.color}
                        onChange={(e) => patchLane(l.id, { color: e.target.value }, `lc${l.id}`)}
                        className="size-7 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                        aria-label="لون اسم المسار"
                      />
                      <Input value={l.name} onChange={(e) => patchLane(l.id, { name: e.target.value }, `ln${l.id}`)} className="h-8 min-w-0 flex-1 px-2" aria-label="اسم المسار" />
                      <Input
                        type="number"
                        min={160}
                        max={900}
                        step={20}
                        value={l.w}
                        onChange={(e) => patchLane(l.id, { w: Math.min(900, Math.max(160, Number(e.target.value) || 340)) }, `lw${l.id}`)}
                        className="h-8 w-16 shrink-0 px-1.5"
                        aria-label="عرض المسار"
                      />
                      <Button size="icon-sm" variant="ghost" className="size-6" disabled={i === 0} onClick={() => moveLane(i, -1)} aria-label="نحو اليمين">
                        <ArrowUp className="size-3.5 -rotate-90" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="size-6" disabled={i === lanes.length - 1} onClick={() => moveLane(i, 1)} aria-label="نحو اليسار">
                        <ArrowDown className="size-3.5 -rotate-90" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-6 hover:text-destructive"
                        onClick={() => confirm(`حذف المسار "${l.name}"؟`) && setLanes((ls) => ls.filter((x) => x.id !== l.id))}
                        aria-label="حذف المسار"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="self-start" onClick={() => setLanes((ls) => [...ls, makeLane(`مسار ${ls.length + 1}`, ls.length)])}>
                    <Plus /> إضافة مسار
                  </Button>
                </div>
              ) : (
                <p className="border-t pt-3 text-xs leading-6 text-muted-foreground">
                  هذا مخطط مستورد: المسارات جزء من الرسم الأصلي ولا يمكن تعديلها هنا، لكن يمكن تعديل الأشكال والأسهم.
                </p>
              )}

              <p className="text-xs leading-6 text-muted-foreground">
                اسحب الشكل لتحريكه واسحب مربعات الزوايا لتغيير حجمه. مفتاح Delete يحذف المحدد.
              </p>
              {doc.shapes.length > 0 && (
                <Button size="sm" variant="ghost" className="self-start" onClick={() => confirm("مسح الأشكال والأسهم؟") && edit((d) => ({ ...d, shapes: [], lines: [] }))}>
                  <Trash2 /> مسح الأشكال
                </Button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <Field label={label}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-8 cursor-pointer rounded border bg-transparent p-0.5" />
    </Field>
  );
}
