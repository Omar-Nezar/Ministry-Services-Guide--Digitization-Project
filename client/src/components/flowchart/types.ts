// Copy of the converter's xlsx-reader/src/copy/types.ts
// "Copy mode": the drawing exactly as it is in Excel (positions, sizes, colours, text, lines),
// plus the sheet's cells (text, fills, borders) under it. Nothing is interpreted.

export type Para = { text: string; align: "left" | "center" | "right" | "justify"; size: number; bold: boolean; color: string }

export type CopyText = {
  paras: Para[]
  anchor: "top" | "middle" | "bottom"
  rtl: boolean
  inset: [number, number, number, number] // left, top, right, bottom (px)
}

export type CopyShape = {
  id: string
  prst: string // Excel shape type: rect, roundRect, ellipse, flowChartDecision, ...
  x: number; y: number; w: number; h: number // px, before rotation
  rot: number // degrees, clockwise
  flipH: boolean; flipV: boolean
  fill: string // "none" or #rrggbb
  stroke: string; strokeW: number; dash?: string
  text?: CopyText
  img?: string // data: URL for pictures
}

export type CopyLine = {
  id: string
  points: [number, number][] // px, absolute
  route: "straight" | "elbow" | "curve"
  color: string; width: number; dash?: string
  head: boolean // arrowhead at the first point
  tail: boolean // arrowhead at the last point
  from?: string; to?: string // shape ids the ends are glued to
  text?: CopyText
}

export type CopyCell = {
  x: number; y: number; w: number; h: number
  fill?: string
  border?: { t?: [string, number]; r?: [string, number]; b?: [string, number]; l?: [string, number] }
  text?: string
  align?: "left" | "center" | "right"
  valign?: "top" | "middle" | "bottom"
  size?: number; bold?: boolean; color?: string; wrap?: boolean
}

/** A swimlane column. The editor draws it as cells (gray header + tall bordered body), like the Excel diagrams. */
export type CopyLane = { id: string; name: string; color: string; w: number }

export type CopyDoc = {
  mode: "copy"
  width: number; height: number
  rtl: boolean
  cells: CopyCell[]
  shapes: CopyShape[]
  lines: CopyLine[]
  // Added by the diagram editor (readers ignore them; the drawing itself is still just `cells`).
  // When `lanes` is set the editor regenerates `cells` from these. Lanes are listed in reading order:
  // the first lane is the right-most one (the flow starts there).
  lanes?: CopyLane[]
  title?: string // big blue line above the lanes
  path?: string // gray line: مسار الخدمة / الإجراء
  time?: string // blue line: الوقت المستغرق
}

export const isCopyDoc = (d: unknown): d is CopyDoc =>
  !!d && typeof d === "object" && (d as CopyDoc).mode === "copy"
