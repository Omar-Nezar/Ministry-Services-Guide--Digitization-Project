import type {
  CopyCell,
  CopyDoc,
  CopyLane,
  CopyLine,
  CopyShape,
  CopyText,
} from "@/components/flowchart/types";

type Pt = [number, number];

export const SNAP = 10;
export const snap = (n: number) => Math.round(n / SNAP) * SNAP;
export const uid = () => Math.random().toString(36).slice(2, 9);

// ---- shapes: the ones the Excel diagrams use, with their colours --------------------------

export type ShapeKind = {
  key: string;
  label: string;
  prst: string;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeW: number;
  text: string;
  size: number;
  bold: boolean;
  color: string;
  align: "left" | "center" | "right";
};

const base = {
  bold: false,
  color: "#000000",
  align: "center" as const,
  size: 18,
};

export const SHAPE_KINDS: ShapeKind[] = [
  {
    ...base,
    key: "start",
    label: "البداية",
    prst: "ellipse",
    w: 160,
    h: 56,
    fill: "#c0504d",
    stroke: "#e46c0a",
    strokeW: 1.33,
    text: "البداية",
    size: 22,
    bold: true,
    color: "#ffffff",
  },
  {
    ...base,
    key: "end",
    label: "النهاية",
    prst: "ellipse",
    w: 160,
    h: 56,
    fill: "#c0504d",
    stroke: "#e46c0a",
    strokeW: 1.33,
    text: "النهاية",
    size: 22,
    bold: true,
    color: "#ffffff",
  },
  {
    ...base,
    key: "step",
    label: "إجراء",
    prst: "roundRect",
    w: 230,
    h: 120,
    fill: "#ffffff",
    stroke: "#604a7b",
    strokeW: 3,
    text: " ♦ \nالوقت المستغرق : يوم",
    align: "right",
  },
  {
    ...base,
    key: "decision",
    label: "قرار",
    prst: "diamond",
    w: 190,
    h: 120,
    fill: "#4f81bd",
    stroke: "#28415f",
    strokeW: 1.33,
    text: "قرار",
    bold: true,
    color: "#ffffff",
  },
  {
    ...base,
    key: "yes",
    label: "نعم",
    prst: "rect",
    w: 60,
    h: 34,
    fill: "#4f81bd",
    stroke: "#28415f",
    strokeW: 1.33,
    text: "نعم",
    color: "#ffffff",
  },
  {
    ...base,
    key: "no",
    label: "لا",
    prst: "rect",
    w: 60,
    h: 34,
    fill: "#4f81bd",
    stroke: "#28415f",
    strokeW: 1.33,
    text: "لا",
    color: "#ffffff",
  },
  {
    ...base,
    key: "state",
    label: "حالة",
    prst: "flowChartConnector",
    w: 170,
    h: 60,
    fill: "#ffffff",
    stroke: "#4bacc6",
    strokeW: 1.33,
    text: "مكتمل",
    bold: true,
  },
  {
    ...base,
    key: "note",
    label: "ملاحظة",
    prst: "rect",
    w: 220,
    h: 80,
    fill: "#fff2cc",
    stroke: "#bf9000",
    strokeW: 2,
    text: "ملاحظة",
    align: "right",
    size: 16,
  },
  {
    ...base,
    key: "text",
    label: "نص",
    prst: "rect",
    w: 160,
    h: 40,
    fill: "none",
    stroke: "none",
    strokeW: 1,
    text: "نص",
    size: 20,
  },
];

/**
 * Returns the shape palette labels and default text in the selected language.
 * The shape geometry, styling, and identifiers remain unchanged.
 */
export function getShapeKinds(isArabic: boolean): ShapeKind[] {
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  return SHAPE_KINDS.map((shape) => {
    switch (shape.key) {
      case "start":
        return {
          ...shape,
          label: t("البداية", "Start"),
          text: t("البداية", "Start"),
        };

      case "end":
        return {
          ...shape,
          label: t("النهاية", "End"),
          text: t("النهاية", "End"),
        };

      case "step":
        return {
          ...shape,
          label: t("إجراء", "Process"),
          text: t(" ♦ \nالوقت المستغرق : يوم", " ♦ \nTime required: 1 day"),
        };

      case "decision":
        return {
          ...shape,
          label: t("قرار", "Decision"),
          text: t("قرار", "Decision"),
        };

      case "yes":
        return {
          ...shape,
          label: t("نعم", "Yes"),
          text: t("نعم", "Yes"),
        };

      case "no":
        return {
          ...shape,
          label: t("لا", "No"),
          text: t("لا", "No"),
        };

      case "state":
        return {
          ...shape,
          label: t("حالة", "Status"),
          text: t("مكتمل", "Completed"),
        };

      case "note":
        return {
          ...shape,
          label: t("ملاحظة", "Note"),
          text: t("ملاحظة", "Note"),
        };

      case "text":
        return {
          ...shape,
          label: t("نص", "Text"),
          text: t("نص", "Text"),
        };

      default:
        return shape;
    }
  });
}

export function makeText(
  text: string,
  style?: Partial<CopyText["paras"][number]>,
  like?: CopyText,
): CopyText {
  const first = like?.paras[0];

  return {
    paras: text.split("\n").map((t) => ({
      text: t,
      align: "center",
      size: 18,
      bold: false,
      color: "#000000",
      ...(first && {
        align: first.align,
        size: first.size,
        bold: first.bold,
        color: first.color,
      }),
      ...style,
    })),
    anchor: like?.anchor ?? "middle",
    rtl: true,
    inset: like?.inset ?? [9.6, 4.8, 9.6, 4.8],
  };
}

export function makeShape(
  k: ShapeKind,
  x: number,
  y: number,
): CopyShape {
  return {
    id: `s${uid()}`,
    prst: k.prst,
    x,
    y,
    w: k.w,
    h: k.h,
    rot: 0,
    flipH: false,
    flipV: false,
    fill: k.fill,
    stroke: k.stroke,
    strokeW: k.strokeW,
    text: makeText(k.text, {
      align: k.align,
      size: k.size,
      bold: k.bold,
      color: k.color,
    }),
  };
}

export function makeLine(from: string, to: string): CopyLine {
  return {
    id: `l${uid()}`,
    points: [
      [0, 0],
      [0, 0],
    ],
    route: "elbow",
    color: "#8064a2",
    width: 2,
    head: false,
    tail: true,
    from,
    to,
  };
}

/** Points of a connector between two shapes, leaving/entering through the facing sides. */
export function route(
  a: CopyShape,
  b: CopyShape,
  mode: CopyLine["route"],
): Pt[] {
  const acx = a.x + a.w / 2,
    acy = a.y + a.h / 2,
    bcx = b.x + b.w / 2,
    bcy = b.y + b.h / 2;

  let p: Pt, q: Pt, vertical: boolean;

  if (b.y >= a.y + a.h) {
    p = [acx, a.y + a.h];
    q = [bcx, b.y];
    vertical = true;
  } else if (b.y + b.h <= a.y) {
    p = [acx, a.y];
    q = [bcx, b.y + b.h];
    vertical = true;
  } else if (b.x >= a.x + a.w) {
    p = [a.x + a.w, acy];
    q = [b.x, bcy];
    vertical = false;
  } else if (b.x + b.w <= a.x) {
    p = [a.x, acy];
    q = [b.x + b.w, bcy];
    vertical = false;
  } else if (bcy >= acy) {
    p = [acx, a.y + a.h];
    q = [bcx, b.y];
    vertical = true;
  } else {
    p = [acx, a.y];
    q = [bcx, b.y + b.h];
    vertical = true;
  }

  if (mode === "straight") return [p, q];

  if (mode === "curve") {
    return vertical
      ? [
        p,
        [p[0], p[1] + (q[1] - p[1]) / 2],
        [q[0], q[1] - (q[1] - p[1]) / 2],
        q,
      ]
      : [
        p,
        [p[0] + (q[0] - p[0]) / 2, p[1]],
        [q[0] - (q[0] - p[0]) / 2, q[1]],
        q,
      ];
  }

  if (vertical) {
    if (Math.abs(p[0] - q[0]) < 2) return [p, q];

    const m = (p[1] + q[1]) / 2;

    return [p, [p[0], m], [q[0], m], q];
  }

  if (Math.abs(p[1] - q[1]) < 2) return [p, q];

  const m = (p[0] + q[0]) / 2;

  return [p, [m, p[1]], [m, q[1]], q];
}

// ---- swimlanes -----------------------------------------------------------------------

const MARGIN = 10;
const ROW_H = 46;
const HEADER_H = 60;

export const LANE_COLORS = [
  "#ff3300",
  "#006600",
  "#0070c0",
  "#7030a0",
  "#c55a11",
  "#548235",
];

export const makeLane = (
  name: string,
  i = 0,
): CopyLane => ({
  id: `n${uid()}`,
  name,
  color: i === 0 ? LANE_COLORS[0] : "#006600",
  w: 340,
});

/** x of the lane's left edge: lanes read right to left, so the first lane is the right-most. */
export function laneLeft(
  lanes: CopyLane[],
  i: number,
): number {
  return (
    MARGIN +
    lanes.slice(i + 1).reduce((s, l) => s + l.w, 0)
  );
}

export function laneAt(
  lanes: CopyLane[],
  x: number,
): number {
  for (let i = 0; i < lanes.length; i++) {
    if (x >= laneLeft(lanes, i)) return i;
  }

  return lanes.length - 1;
}

/** y where the lane headers start (below the title / path / time lines). */
export const headerTop = (doc: CopyDoc) =>
  MARGIN +
  [doc.title, doc.path, doc.time, ...(doc.heads ?? [])].filter(
    (t) => t != null && t !== "",
  ).length *
  ROW_H;

/** y where the lane bodies start: shapes go below this. */
export const bodyTop = (doc: CopyDoc) =>
  headerTop(doc) + (doc.lanes?.length ? HEADER_H : 0);

const line = (c: [string, number] = ["#000000", 1]) => c;
const allSides = {
  t: line(),
  r: line(),
  b: line(),
  l: line(),
};

function laneCells(doc: CopyDoc): CopyCell[] {
  const lanes = doc.lanes!;
  const cells: CopyCell[] = [];
  const full = doc.width - MARGIN * 2;
  let y = MARGIN;

  const row = (
    text: string | undefined,
    color: string,
    size: number,
    fill?: string,
  ) => {
    if (text == null || text === "") return;

    cells.push({
      x: MARGIN,
      y,
      w: full,
      h: ROW_H,
      text,
      align: "right",
      valign: "middle",
      size,
      bold: true,
      color,
      fill,
      wrap: true,
    });

    y += ROW_H;
  };

  row(doc.title, "#1f497d", 26);
  row(doc.path, "#006600", 22, "#d9d9d9");
  row(doc.time, "#0000cc", 22);
  (doc.heads ?? []).forEach((h) => row(h, "#1f497d", 22));

  const bodyH = Math.max(
    100,
    doc.height - y - HEADER_H - MARGIN,
  );

  lanes.forEach((l, i) => {
    const x = laneLeft(lanes, i);

    cells.push({
      x,
      y,
      w: l.w,
      h: HEADER_H,
      fill: "#d9d9d9",
      text: l.name,
      align: "center",
      valign: "middle",
      size: 22,
      bold: true,
      color: l.color,
      wrap: true,
      border: allSides,
    });

    cells.push({
      x,
      y: y + HEADER_H,
      w: l.w,
      h: bodyH,
      fill: "#ffffff",
      border: allSides,
    });
  });

  return cells;
}

/** Moves shapes/lines with their lane after the lanes changed (added, removed, resized, renamed, reordered). */
export function relayout(
  doc: CopyDoc,
  next: CopyLane[],
): CopyDoc {
  const old = doc.lanes ?? [];

  if (!old.length) return { ...doc, lanes: next };

  const shift = (x: number) => {
    const i = laneAt(old, x);
    const j = next.findIndex((l) => l.id === old[i].id);

    return j < 0
      ? 0
      : laneLeft(next, j) - laneLeft(old, i);
  };

  const shapes = doc.shapes.map((s) => ({
    ...s,
    x: Math.max(0, s.x + shift(s.x + s.w / 2)),
  }));

  const lines = doc.lines.map((l) => {
    if (l.from && l.to) return l;

    const d = shift(l.points[0][0]);

    return {
      ...l,
      points: l.points.map(
        ([x, y]) => [x + d, y] as Pt,
      ),
    };
  });

  return { ...doc, lanes: next, shapes, lines };
}

/**
 * Turns an imported drawing (plain cells) into an editable swimlane diagram: the last row of gray header cells becomes
 * the lanes, the text rows above them become the title lines, and shapes move with their lane.
 * Returns null when no lane headers are found.
 */
export function toLanes(doc: CopyDoc): CopyDoc | null {
  const grays = doc.cells.filter(
    (c) => isGray(c.fill) && c.w > 0 && c.h <= 260,
  );
  const rowY = Math.max(
    -1,
    ...grays.filter((c) => c.text?.trim()).map((c) => c.y),
  );
  if (rowY < 0) return null;

  const headers = grays
    .filter((c) => eq(c.y, rowY) && c.text?.trim())
    .sort((a, b) => b.x - a.x);
  if (!headers.length) return null;

  const lanes: CopyLane[] = headers.map((h) => ({
    id: `n${uid()}`,
    name: h.text!.trim(),
    color: h.color && h.color !== "#ffffff" ? h.color : "#006600",
    w: Math.min(900, Math.max(160, Math.round(h.w))),
  }));

  const above = doc.cells
    .filter((c) => c.text?.trim() && c.y < rowY - 2)
    .sort((a, b) => a.y - b.y || b.x - a.x)
    .map((c) => c.text!.trim());

  const out: CopyDoc = {
    ...doc,
    lanes,
    title: above[0],
    path: above[1],
    time: above[2],
    heads: above.slice(3),
  };

  const dy = bodyTop(out) - (rowY + headers[0].h);
  const laneOf = (x: number) =>
    headers.findIndex((h) => x >= h.x - 1 && x <= h.x + h.w + 1);
  const dx = (x: number) => {
    const i = laneOf(x);
    return i < 0 ? 0 : laneLeft(lanes, i) - headers[i].x;
  };

  out.shapes = doc.shapes.map((s) => ({
    ...s,
    x: Math.max(0, s.x + dx(s.x + s.w / 2)),
    y: Math.max(0, s.y + dy),
  }));

  out.lines = doc.lines.map((l) => {
    if (l.from && l.to) return l;
    const d = dx(l.points[0][0]);
    return {
      ...l,
      points: l.points.map(([x, y]) => [x + d, y + dy] as Pt),
    };
  });

  return out;
}

export const newDoc =(title = ""): CopyDoc => ({
  mode: "copy",
  width: 1060,
  height: 700,
  rtl: true,
  cells: [],
  shapes: [],
  lines: [],
  title,
  lanes: [
    makeLane("مقدم الطلب", 0),
    makeLane("القسم المختص", 1),
    makeLane("الدائرة", 2),
  ],
});

/** Recomputes every glued connector, the swimlane cells, and grows the canvas to hold the shapes. */
export function normalize(doc: CopyDoc): CopyDoc {
  const byId = new Map(doc.shapes.map((s) => [s.id, s]));

  const lines = doc.lines
    .filter(
      (l) =>
        !(l.from && l.to) ||
        (byId.has(l.from) && byId.has(l.to)),
    )
    .map((l) => {
      const a = l.from ? byId.get(l.from) : undefined;
      const b = l.to ? byId.get(l.to) : undefined;

      return a && b
        ? { ...l, points: route(a, b, l.route) }
        : l;
    });

  const right = Math.max(
    0,
    ...doc.shapes.map((s) => s.x + s.w),
  );

  const bottom = Math.max(
    0,
    ...doc.shapes.map((s) => s.y + s.h),
  );

  const lanesW = doc.lanes?.length
    ? doc.lanes.reduce((s, l) => s + l.w, 0) + MARGIN * 2
    : 0;

  const width = doc.lanes?.length
    ? lanesW
    : Math.max(doc.width, right + 40);

  const out = {
    ...doc,
    lines,
    width,
    height: Math.max(
      doc.height,
      bottom + 40,
      bodyTop(doc) + 300,
    ),
  };

  return doc.lanes
    ? { ...out, cells: laneCells(out) }
    : out;
}

export function parseDoc(
  json: string | null,
  title = "",
): CopyDoc {
  try {
    const d = json ? JSON.parse(json) : null;

    if (
      d &&
      d.mode === "copy" &&
      Array.isArray(d.shapes) &&
      Array.isArray(d.lines)
    ) {
      return { ...d, cells: d.cells ?? [] };
    }
  } catch {
    /* fall through */
  }

  return normalize(newDoc(title));
}

/** Reads a converter file ({ sheets: [{ sheet, doc }] }) or a bare drawing. */
export function sheetsOf(
  json: unknown,
): { name: string; doc: CopyDoc }[] {
  const j = json as {
    sheets?: { sheet?: string; doc?: CopyDoc }[];
    mode?: string;
  };

  if (j?.mode === "copy") {
    return [{ name: "المخطط", doc: j as unknown as CopyDoc }];
  }

  return (j?.sheets ?? [])
    .filter((s) => s.doc?.mode === "copy")
    .map((s, i) => ({
      name: (s.sheet ?? "").trim() || `ورقة ${i + 1}`,
      doc: s.doc!,
    }));
}
// ---- category theme ------------------------------------------------------------------
// The whole drawing is shaded from one colour, the category's colour for the workflow label: solid lane headers,
// tinted lane columns, dark start/end, mid-tone decisions, light processes. It is applied when drawing, so the stored
// diagrams (Excel imports included) are not changed.

const HEX = /^#[0-9a-f]{6}$/i;

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function shades(base: string) {
  const [h, s, l] = toHsl(base);
  const t = Math.min(s, 0.6);
  return {
    header: base,
    headerText: l > 0.6 ? "#1f2937" : "#ffffff",
    ink: fromHsl(h, s, Math.min(l, 0.3)),
    body: fromHsl(h, t, 0.96),
    step: fromHsl(h, t, 0.88),
    stepLine: base,
    terminal: fromHsl(h, s, Math.min(l, 0.4) * 0.65),
    terminalLine: fromHsl(h, s, Math.min(l, 0.4) * 0.45),
    decision: base,
    decisionLine: fromHsl(h, s, Math.min(l, 0.4) * 0.6),
  };
}

const LINE_COLOR = "#374151";
const eq = (a: number, b: number, t = 2) => Math.abs(a - b) <= t;
const isGray = (c?: string) => c?.toLowerCase() === "#d9d9d9";
const oneOf = (c: string, list: string[]) => list.includes(c.toLowerCase());
const white = (t: CopyText): CopyText => ({ ...t, paras: t.paras.map((p) => ({ ...p, color: "#ffffff" })) });

/**
 * Recolours a diagram in shades of `base`.
 * Every lane gets a solid header and a tinted column down to the bottom of the diagram; `bg` holds those column
 * backgrounds (drawn under the cells, so the cell indexes stay the same).
 */
export function themeDoc(doc: CopyDoc, base?: string | null): CopyDoc {
  if (!base || !HEX.test(base)) return doc;
  const k = shades(base);
  const cells = doc.cells.map((c) => ({ ...c }));
  const plain = (f?: string) => !f || f.toLowerCase() === "#ffffff";

  // lane headers: the last row of gray cells (the rows above it are info bars)
  const grays = cells.filter((c) => isGray(c.fill) && c.w > 0 && c.h <= 260);
  const rowY = Math.max(-1, ...grays.filter((c) => c.text?.trim()).map((c) => c.y));
  const headers = rowY < 0 ? [] : grays.filter((c) => eq(c.y, rowY));
  grays.forEach((c) => {
    if (headers.includes(c)) return;
    c.fill = k.step;
    c.color = k.ink;
  });
  headers.forEach((h) => {
    h.fill = k.header;
    h.color = k.headerText;
  });

  // the title / time lines above the lanes: the category colour instead of blue, navy or red
  cells.forEach((c) => {
    if (c.text?.trim() && !c.fill && c.color && !oneOf(c.color, ["#000000", "#ffffff"])) c.color = k.ink;
  });

  const bg: CopyCell[] = [];
  if (headers.length) {
    const inLane = (h: CopyCell, x: number) => x >= h.x - 1 && x <= h.x + h.w + 1;
    const bottoms = headers.map((h) => {
      const top = h.y + h.h;
      const ys = [
        ...cells.filter((c) => !headers.includes(c) && c.y >= top - 2 && c.w <= h.w * 1.3 && inLane(h, c.x + c.w / 2)).map((c) => c.y + c.h),
        ...doc.shapes.filter((s) => inLane(h, s.x + s.w / 2)).map((s) => s.y + s.h + 20),
      ];
      return Math.max(top, ...ys);
    });
    const bottom = Math.max(...bottoms);
    headers.forEach((h) => bg.push({ x: h.x, y: h.y + h.h, w: h.w, h: bottom - (h.y + h.h), fill: k.body }));
    cells.forEach((c) => {
      if (headers.includes(c) || !plain(c.fill)) return;
      const h = headers.find((x) => c.y >= x.y + x.h - 2 && c.w <= x.w * 1.3 && inLane(x, c.x + c.w / 2));
      if (h) c.fill = k.body;
    });
  }

  // by role, whatever fill the shape came with: start/end, decisions (and their yes/no boxes), everything else a process
  const shapes = doc.shapes.map((s) => {
    const fill = s.fill.toLowerCase();
    if (s.img || s.prst === "star4" || (fill === "none" && s.stroke === "none")) return s;
    const [, sat, light] = HEX.test(fill) ? toHsl(fill) : [0, 0, 1];
    const strong = sat > 0.2 && light < 0.75;
    const terminal = s.prst === "ellipse" || s.prst === "flowChartTerminator" || (s.prst === "flowChartConnector" && strong);
    const decision = s.prst === "diamond" || s.prst === "flowChartDecision" || (s.prst === "rect" && strong);
    if (terminal) return { ...s, fill: k.terminal, stroke: k.terminalLine, text: s.text && white(s.text) };
    if (decision) return { ...s, fill: k.decision, stroke: k.decisionLine, text: s.text && white(s.text) };
    return { ...s, fill: k.step, stroke: k.stepLine };
  });

  return { ...doc, cells, shapes, bg, lines: doc.lines.map((l) => ({ ...l, color: LINE_COLOR })) };
}
