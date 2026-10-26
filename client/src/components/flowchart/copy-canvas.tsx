// Copy of the converter's xlsx-reader/src/copy/CopyCanvas.tsx (the Excel viewer page):
// draws a copy-mode diagram exactly as it was in Excel (SVG). Here only <Drawing> is used,
// without the edit handlers, so it is read-only. Keep in step with the converter.
import type { CopyCell, CopyDoc, CopyLine, CopyShape, CopyText } from "@/components/flowchart/types"

type Pt = [number, number]
const ARABIC = /[؀-ۿ]/

// ---- shapes ------------------------------------------------------------------------
// outline of an Excel shape type inside a w x h box
function outline(prst: string, w: number, h: number): string {
  const p = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x},${y}`).join("L")}Z`
  const r = (rx: number) => `M${rx},0H${w - rx}A${rx},${rx} 0 0 1 ${w},${rx}V${h - rx}A${rx},${rx} 0 0 1 ${w - rx},${h}H${rx}A${rx},${rx} 0 0 1 0,${h - rx}V${rx}A${rx},${rx} 0 0 1 ${rx},0Z`
  const m = Math.min(w, h)
  switch (prst) {
    case "roundRect": case "flowChartAlternateProcess": return r(m * 0.1667)
    case "flowChartTerminator": return r(Math.min(h / 2, w / 2))
    case "ellipse": case "flowChartConnector":
      return `M0,${h / 2}A${w / 2},${h / 2} 0 1 0 ${w},${h / 2}A${w / 2},${h / 2} 0 1 0 0,${h / 2}Z`
    case "diamond": case "flowChartDecision": return p([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]])
    case "parallelogram": case "flowChartInputOutput": { const d = prst === "parallelogram" ? m * 0.25 : w * 0.2; return p([[d, 0], [w, 0], [w - d, h], [0, h]]) }
    case "trapezoid": return p([[m * 0.25, 0], [w - m * 0.25, 0], [w, h], [0, h]])
    case "flowChartManualOperation": return p([[0, 0], [w, 0], [w * 0.8, h], [w * 0.2, h]])
    case "flowChartManualInput": return p([[0, h * 0.2], [w, 0], [w, h], [0, h]])
    case "hexagon": case "flowChartPreparation": { const d = prst === "hexagon" ? m * 0.25 : w * 0.2; return p([[d, 0], [w - d, 0], [w, h / 2], [w - d, h], [d, h], [0, h / 2]]) }
    case "octagon": { const d = m * 0.29; return p([[d, 0], [w - d, 0], [w, d], [w, h - d], [w - d, h], [d, h], [0, h - d], [0, d]]) }
    case "triangle": case "flowChartExtract": return p([[w / 2, 0], [w, h], [0, h]])
    case "flowChartMerge": return p([[0, 0], [w, 0], [w / 2, h]])
    case "rtTriangle": return p([[0, 0], [w, h], [0, h]])
    case "pentagon": case "homePlate": return p([[0, 0], [w - m * 0.5, 0], [w, h / 2], [w - m * 0.5, h], [0, h]])
    case "chevron": return p([[0, 0], [w - m * 0.5, 0], [w, h / 2], [w - m * 0.5, h], [0, h], [m * 0.5, h / 2]])
    case "flowChartOffpageConnector": return p([[0, 0], [w, 0], [w, h * 0.8], [w / 2, h], [0, h * 0.8]])
    case "flowChartPunchedCard": return p([[w * 0.2, 0], [w, 0], [w, h], [0, h], [0, h * 0.2]])
    case "rightArrow": return p([[0, h * 0.25], [w - m / 2, h * 0.25], [w - m / 2, 0], [w, h / 2], [w - m / 2, h], [w - m / 2, h * 0.75], [0, h * 0.75]])
    case "leftArrow": return p([[w, h * 0.25], [m / 2, h * 0.25], [m / 2, 0], [0, h / 2], [m / 2, h], [m / 2, h * 0.75], [w, h * 0.75]])
    case "downArrow": return p([[w * 0.25, 0], [w * 0.75, 0], [w * 0.75, h - m / 2], [w, h - m / 2], [w / 2, h], [0, h - m / 2], [w * 0.25, h - m / 2]])
    case "upArrow": return p([[w / 2, 0], [w, m / 2], [w * 0.75, m / 2], [w * 0.75, h], [w * 0.25, h], [w * 0.25, m / 2], [0, m / 2]])
    case "flowChartDocument": return `M0,0H${w}V${h * 0.83}C${w * 0.75},${h * 0.66} ${w * 0.5},${h * 1.05} 0,${h * 0.9}Z`
    case "flowChartMultidocument": return `M0,${h * 0.1}H${w * 0.9}V${h * 0.83}C${w * 0.7},${h * 0.7} ${w * 0.45},${h * 1.05} 0,${h * 0.9}Z`
    case "can": case "flowChartMagneticDisk": { const e = h * 0.1; return `M0,${e}A${w / 2},${e} 0 0 1 ${w},${e}V${h - e}A${w / 2},${e} 0 0 1 0,${h - e}Z M0,${e}A${w / 2},${e} 0 0 0 ${w},${e}` }
    case "flowChartDelay": return `M0,0H${w / 2}A${w / 2},${h / 2} 0 0 1 ${w / 2},${h}H0Z`
    case "plaque": case "snip1Rect": { const d = m * 0.16; return p([[0, 0], [w - d, 0], [w, d], [w, h], [0, h]]) }
    case "wedgeRectCallout": case "wedgeRoundRectCallout": return p([[0, 0], [w, 0], [w, h], [w * 0.4, h], [w * 0.2, h * 1.25], [w * 0.25, h], [0, h]])
    case "cloud": case "cloudCallout": return r(m * 0.45)
    default: return `M0,0H${w}V${h}H0Z`
  }
}

// extra inner lines some flowchart shapes have
function inner(prst: string, w: number, h: number): string | undefined {
  if (prst === "flowChartPredefinedProcess") return `M${w * 0.125},0V${h}M${w * 0.875},0V${h}`
  if (prst === "flowChartInternalStorage") return `M${w * 0.1},0V${h}M0,${h * 0.1}H${w}`
  if (prst === "flowChartSummingJunction" || prst === "flowChartOr") return `M${w / 2},0V${h}M0,${h / 2}H${w}`
  return undefined
}

function TextBox({ t, w, h }: { t: CopyText; w: number; h: number }) {
  const [l, top, r, b] = t.inset
  const rtl = t.rtl || t.paras.some((p) => ARABIC.test(p.text))
  return (
    <foreignObject x={0} y={0} width={Math.max(w, 1)} height={Math.max(h, 1)} style={{ overflow: "visible", pointerEvents: "none" }}>
      <div dir={rtl ? "rtl" : "ltr"} style={{
        width: w, height: h, boxSizing: "border-box", padding: `${top}px ${r}px ${b}px ${l}px`, display: "flex", flexDirection: "column",
        justifyContent: t.anchor === "middle" ? "center" : t.anchor === "bottom" ? "flex-end" : "flex-start",
        fontFamily: "Calibri, 'Segoe UI', Tahoma, Arial, sans-serif", lineHeight: 1.2, overflowWrap: "anywhere",
      }}>
        {t.paras.map((p, i) => (
          <div key={i} style={{ flexShrink: 0, textAlign: p.align, fontSize: p.size, fontWeight: p.bold ? 700 : 400, color: p.color, whiteSpace: "pre-wrap", minHeight: p.size * 1.2 }}>
            {p.text}
          </div>
        ))}
      </div>
    </foreignObject>
  )
}

// The rectangle inside a shape where Excel lays out its text (from the preset shape definitions).
// A diamond's text lives in the middle half, an ellipse's in the inscribed square, and so on.
function textRect(prst: string, w: number, h: number): [number, number, number, number] {
  const k = 0.29289 // 1 - cos(45°)
  switch (prst) {
    case "diamond": case "flowChartDecision": return [w / 4, h / 4, (w * 3) / 4, (h * 3) / 4]
    case "ellipse": case "flowChartConnector": case "flowChartSummingJunction": case "flowChartOr": {
      const d = 0.14645; return [w * d, h * d, w * (1 - d), h * (1 - d)]
    }
    case "flowChartTerminator": return [(w * 1018) / 21600, (h * 3163) / 21600, (w * 20582) / 21600, (h * 18437) / 21600]
    case "roundRect": { const r = Math.min(w, h) * (16667 / 100000) * k; return [r, r, w - r, h - r] }
    case "flowChartAlternateProcess": { const r = (Math.min(w, h) / 6) * k; return [r, r, w - r, h - r] }
    case "flowChartPreparation": return [w / 5, 0, (w * 4) / 5, h]
    default: return [0, 0, w, h]
  }
}

function ShapeView({ s, selected, onDown }: { s: CopyShape; selected: boolean; onDown?: (e: React.PointerEvent) => void }) {
  const tf = [`translate(${s.x},${s.y})`]
  if (s.rot) tf.push(`rotate(${s.rot},${s.w / 2},${s.h / 2})`)
  const flip = s.flipH || s.flipV ? `translate(${s.flipH ? s.w : 0},${s.flipV ? s.h : 0}) scale(${s.flipH ? -1 : 1},${s.flipV ? -1 : 1})` : undefined
  const extra = inner(s.prst, s.w, s.h)
  return (
    <g transform={tf.join(" ")} onPointerDown={onDown} style={{ cursor: onDown ? "move" : undefined }}>
      <g transform={flip}>
        {s.img ? <image href={s.img} width={s.w} height={s.h} preserveAspectRatio="none" />
          : <path d={outline(s.prst, s.w, s.h)} fill={s.fill === "none" ? "transparent" : s.fill}
            stroke={s.stroke === "none" ? undefined : s.stroke} strokeWidth={s.strokeW} strokeDasharray={s.dash} />}
        {extra && s.stroke !== "none" && <path d={extra} fill="none" stroke={s.stroke} strokeWidth={s.strokeW} />}
      </g>
      {s.text && (() => {
        const [l, t, r, b] = textRect(s.prst, s.w, s.h)
        return <g transform={`translate(${l},${t})`}><TextBox t={s.text} w={r - l} h={b - t} /></g>
      })()}
      {selected && <rect x={-4} y={-4} width={s.w + 8} height={s.h + 8} fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" />}
    </g>
  )
}

// ---- lines -------------------------------------------------------------------------
function linePath(l: CopyLine) {
  const p = l.points
  if (l.route === "curve" && p.length === 4) return `M${p[0]}C${p[1]} ${p[2]} ${p[3]}`
  return `M${p.map((q) => q.join(",")).join("L")}`
}
function arrowHead(tip: Pt, from: Pt, width: number) {
  const len = Math.max(7, width * 3.5), half = len * 0.45
  let dx = tip[0] - from[0], dy = tip[1] - from[1]
  const d = Math.hypot(dx, dy) || 1
  dx /= d; dy /= d
  const bx = tip[0] - dx * len, by = tip[1] - dy * len
  return `M${tip}L${bx - dy * half},${by + dx * half}L${bx + dy * half},${by - dx * half}Z`
}
// the nearest earlier point that is not on top of the end point
const before = (pts: Pt[], end: number, step: number): Pt => {
  for (let i = end + step; i >= 0 && i < pts.length; i += step) if (Math.hypot(pts[i][0] - pts[end][0], pts[i][1] - pts[end][1]) > 0.5) return pts[i]
  return [pts[end][0] - 1, pts[end][1]]
}

function LineView({ l, selected, onDown }: { l: CopyLine; selected: boolean; onDown?: (e: React.PointerEvent) => void }) {
  const p = l.points, n = p.length - 1
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1])
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)]
  return (
    <g onPointerDown={onDown} style={{ cursor: onDown ? "pointer" : undefined }}>
      {onDown && <path d={linePath(l)} fill="none" stroke="transparent" strokeWidth={12} />}
      <path d={linePath(l)} fill="none" stroke={selected ? "#2563eb" : l.color} strokeWidth={l.width} strokeDasharray={l.dash} strokeLinejoin="round" />
      {l.head && <path d={arrowHead(p[0], before(p, 0, 1), l.width)} fill={selected ? "#2563eb" : l.color} />}
      {l.tail && <path d={arrowHead(p[n], before(p, n, -1), l.width)} fill={selected ? "#2563eb" : l.color} />}
      {l.text && <g transform={`translate(${x0},${y0})`}><TextBox t={l.text} w={Math.max(...xs) - x0} h={Math.max(...ys) - y0} /></g>}
    </g>
  )
}

// ---- cells -------------------------------------------------------------------------
function CellView({ c, selected, onDown }: { c: CopyCell; selected?: boolean; onDown?: (e: React.PointerEvent) => void }) {
  const side = (s: [string, number] | undefined, d: string) => s && <path d={d} stroke={s[0]} strokeWidth={s[1]} />
  const b = c.border ?? {}
  const rtl = !!c.text && ARABIC.test(c.text)
  return (
    <g transform={`translate(${c.x},${c.y})`}>
      {c.fill && <rect width={c.w} height={c.h} fill={c.fill} />}
      {side(b.t, `M0,0H${c.w}`)}{side(b.b, `M0,${c.h}H${c.w}`)}{side(b.l, `M0,0V${c.h}`)}{side(b.r, `M${c.w},0V${c.h}`)}
      {c.text && (
        <foreignObject width={Math.max(c.w, 1)} height={Math.max(c.h, 1)} style={{ overflow: "visible", pointerEvents: "none" }}>
          <div dir={rtl ? "rtl" : "ltr"} style={{
            width: c.w, height: c.h, boxSizing: "border-box", padding: "0 3px", display: "flex", flexDirection: "column",
            justifyContent: c.valign === "top" ? "flex-start" : c.valign === "middle" ? "center" : "flex-end",
            textAlign: c.align ?? (rtl ? "right" : "left"), fontSize: c.size ?? 14.67, fontWeight: c.bold ? 700 : 400,
            color: c.color ?? "#000", whiteSpace: c.wrap ? "pre-wrap" : "pre", lineHeight: 1.2,
            fontFamily: "Calibri, 'Segoe UI', Tahoma, Arial, sans-serif",
          }}>{c.text}</div>
        </foreignObject>
      )}
      {onDown && c.text && (
        <rect width={c.w} height={c.h} fill="transparent" stroke={selected ? "#2563eb" : "none"} strokeWidth={2} strokeDasharray="6 3"
          style={{ cursor: "pointer" }} onPointerDown={onDown} />
      )}
    </g>
  )
}

export function Drawing({ doc, sel, onShapeDown, onLineDown, onCellDown, onBgDown }: {
  doc: CopyDoc; sel?: string
  onCellDown?: (i: number, e: React.PointerEvent) => void
  onShapeDown?: (id: string, e: React.PointerEvent) => void
  onLineDown?: (id: string, e: React.PointerEvent) => void
  onBgDown?: () => void
}) {
  return (
    <>
      <rect width={doc.width} height={doc.height} fill="#ffffff" onPointerDown={onBgDown} />
      {doc.cells.map((c, i) => <CellView key={i} c={c} selected={sel === `c:${i}`} onDown={onCellDown && ((e) => onCellDown(i, e))} />)}
      {doc.shapes.map((s) => <ShapeView key={s.id} s={s} selected={sel === `s:${s.id}`} onDown={onShapeDown && ((e) => onShapeDown(s.id, e))} />)}
      {doc.lines.map((l) => <LineView key={l.id} l={l} selected={sel === `l:${l.id}`} onDown={onLineDown && ((e) => onLineDown(l.id, e))} />)}
    </>
  )
}

