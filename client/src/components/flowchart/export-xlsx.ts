// Writes a diagram (CopyDoc) back to an .xlsx the way Excel stores it: the swimlane cells go in the sheet,
// shapes and arrows go in its drawing as native Excel shapes. The reverse of the converter's xlsx reader.
import type { CopyCell, CopyDoc, CopyLine, CopyShape, CopyText } from "@/components/flowchart/types";

type Pt = [number, number];

const EMU = 9525; // 1 px at 96 dpi
const emu = (px: number) => Math.round(px * EMU);
const ARABIC = /[؀-ۿ]/;
const MAX_ROW_PX = 500; // Excel rows are at most 409.5 pt (546 px)

// eslint-disable-next-line no-control-regex
const esc = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hex = (c: string | undefined, fallback = "000000") => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c ?? "");
  if (m) return m[1].toUpperCase();
  const s = /^#?([0-9a-f]{3})$/i.exec(c ?? "");
  return s ? [...s[1]].map((ch) => ch + ch).join("").toUpperCase() : fallback;
};

const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// ---- drawing: text, shapes, lines ---------------------------------------------------
function txBody(t: CopyText): string {
  const [l, top, r, b] = t.inset;
  const rtl = t.rtl || t.paras.some((p) => ARABIC.test(p.text));
  const paras = t.paras
    .map((p) => {
      const rpr = `lang="ar-SA" sz="${Math.max(100, Math.round(p.size * 75))}" b="${p.bold ? 1 : 0}"`;
      const font = `<a:solidFill><a:srgbClr val="${hex(p.color)}"/></a:solidFill><a:latin typeface="Arial"/><a:cs typeface="Arial"/>`;
      const algn = ({ left: "l", center: "ctr", right: "r", justify: "just" } as Record<string, string>)[p.align] ?? "l";
      return (
        `<a:p><a:pPr algn="${algn}"${rtl ? ' rtl="1"' : ""}/>` +
        (p.text ? `<a:r><a:rPr ${rpr}>${font}</a:rPr><a:t>${esc(p.text)}</a:t></a:r>` : "") +
        `<a:endParaRPr ${rpr}>${font}</a:endParaRPr></a:p>`
      );
    })
    .join("");
  const anchor = ({ top: "t", middle: "ctr", bottom: "b" } as Record<string, string>)[t.anchor] ?? "ctr";
  return (
    `<xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip" wrap="square" lIns="${emu(l)}" tIns="${emu(top)}" rIns="${emu(r)}" bIns="${emu(b)}" anchor="${anchor}"><a:noAutofit/></a:bodyPr>` +
    `<a:lstStyle/>${paras}</xdr:txBody>`
  );
}

const xfrm = (x: number, y: number, w: number, h: number, rot = 0, flipH = false, flipV = false) => {
  const r = Math.round((((rot % 360) + 360) % 360) * 60000);
  return (
    `<a:xfrm${r ? ` rot="${r}"` : ""}${flipH ? ' flipH="1"' : ""}${flipV ? ' flipV="1"' : ""}>` +
    `<a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>`
  );
};

const anchored = (x: number, y: number, w: number, h: number, body: string) =>
  `<xdr:absoluteAnchor><xdr:pos x="${emu(x)}" y="${emu(y)}"/><xdr:ext cx="${emu(w)}" cy="${emu(h)}"/>${body}<xdr:clientData/></xdr:absoluteAnchor>`;

const solid = (c: string, fallback?: string) => `<a:solidFill><a:srgbClr val="${hex(c, fallback)}"/></a:solidFill>`;
const dashOf = (d?: string) => (d ? '<a:prstDash val="dash"/>' : "");

function shapeXml(s: CopyShape, id: number, image?: string): string {
  const nv = (kind: "Sp" | "Pic") => `<xdr:nv${kind}Pr><xdr:cNvPr id="${id}" name="${kind === "Pic" ? "Picture" : "Shape"} ${id}"/><xdr:cNv${kind}Pr/></xdr:nv${kind}Pr>`;
  const box = xfrm(0, 0, s.w, s.h, s.rot, s.flipH, s.flipV).replace('<a:off x="0" y="0"/>', `<a:off x="${emu(s.x)}" y="${emu(s.y)}"/>`);
  if (image) {
    return anchored(s.x, s.y, s.w, s.h,
      `<xdr:pic>${nv("Pic")}<xdr:blipFill><a:blip r:embed="${image}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
      `<xdr:spPr>${box}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>`);
  }
  const prst = /^[A-Za-z0-9]+$/.test(s.prst) ? s.prst : "rect";
  const fill = s.fill === "none" ? "<a:noFill/>" : solid(s.fill, "FFFFFF");
  const ln = s.stroke === "none" ? "<a:ln><a:noFill/></a:ln>" : `<a:ln w="${emu(s.strokeW)}">${solid(s.stroke)}${dashOf(s.dash)}</a:ln>`;
  return anchored(s.x, s.y, s.w, s.h,
    `<xdr:sp macro="" textlink="">${nv("Sp")}<xdr:spPr>${box}<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fill}${ln}</xdr:spPr>` +
    `${s.text ? txBody(s.text) : ""}</xdr:sp>`);
}

/** An arrow as a freeform shape that follows the exact points the canvas draws (straight, elbow or curve). */
function lineXml(l: CopyLine, id: number): string {
  const p = l.points;
  if (p.length < 2) return "";
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = Math.max(1 / EMU, Math.max(...xs) - x0), h = Math.max(1 / EMU, Math.max(...ys) - y0);
  const pt = ([x, y]: Pt) => `<a:pt x="${emu(x - x0)}" y="${emu(y - y0)}"/>`;
  const path = l.route === "curve" && p.length === 4
    ? `<a:moveTo>${pt(p[0])}</a:moveTo><a:cubicBezTo>${pt(p[1])}${pt(p[2])}${pt(p[3])}</a:cubicBezTo>`
    : `<a:moveTo>${pt(p[0])}</a:moveTo>${p.slice(1).map((q) => `<a:lnTo>${pt(q)}</a:lnTo>`).join("")}`;
  const arrow = (tag: string, on: boolean) => (on ? `<a:${tag} type="triangle" w="med" len="med"/>` : "");
  return anchored(x0, y0, w, h,
    `<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${id}" name="Arrow ${id}"/><xdr:cNvSpPr/></xdr:nvSpPr>` +
    `<xdr:spPr>${xfrm(x0, y0, w, h)}<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>` +
    `<a:pathLst><a:path w="${Math.max(1, emu(w))}" h="${Math.max(1, emu(h))}" fill="none">${path}</a:path></a:pathLst></a:custGeom><a:noFill/>` +
    `<a:ln w="${emu(l.width)}">${solid(l.color)}${dashOf(l.dash)}<a:round/>${arrow("headEnd", l.head)}${arrow("tailEnd", l.tail)}</a:ln></xdr:spPr>` +
    `${l.text ? txBody(l.text) : ""}</xdr:sp>`);
}

// ---- sheet: cells ---------------------------------------------------------------------
class Styles {
  fonts = ['<font><sz val="11"/><name val="Arial"/></font>'];
  fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  borders = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];

  private idx(list: string[], xml: string) {
    const i = list.indexOf(xml);
    return i >= 0 ? i : list.push(xml) - 1;
  }

  xf(c: CopyCell): number {
    const rtl = !!c.text && ARABIC.test(c.text);
    const pt = Math.round((c.size ?? 14.67) * 0.75 * 2) / 2;
    const font = this.idx(this.fonts, `<font>${c.bold ? "<b/>" : ""}<sz val="${Math.min(409, Math.max(1, pt))}"/><color rgb="FF${hex(c.color)}"/><name val="Arial"/></font>`);
    const fill = c.fill ? this.idx(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${hex(c.fill, "FFFFFF")}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const side = (tag: string, s?: [string, number]) =>
      s ? `<${tag} style="${s[1] <= 1.5 ? "thin" : s[1] <= 3.5 ? "medium" : "thick"}"><color rgb="FF${hex(s[0])}"/></${tag}>` : `<${tag}/>`;
    const b = c.border;
    const border = b ? this.idx(this.borders, `<border>${side("left", b.l)}${side("right", b.r)}${side("top", b.t)}${side("bottom", b.b)}<diagonal/></border>`) : 0;
    const h = c.align ?? (rtl ? "right" : "left");
    const v = ({ top: "top", middle: "center", bottom: "bottom" } as Record<string, string>)[c.valign ?? "bottom"];
    return this.idx(this.xfs,
      `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">` +
      `<alignment horizontal="${h}" vertical="${v}"${c.wrap ? ' wrapText="1"' : ""}${rtl ? ' readingOrder="2"' : ""}/></xf>`);
  }

  xml() {
    const list = (tag: string, items: string[]) => `<${tag} count="${items.length}">${items.join("")}</${tag}>`;
    return (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `${list("fonts", this.fonts)}${list("fills", this.fills)}${list("borders", this.borders)}` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>${list("cellXfs", this.xfs)}` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
    );
  }
}

/** Sorted, de-duplicated grid lines (px); long gaps are split so no row passes Excel's height limit. */
function gridLines(vals: number[], split = false): number[] {
  const out: number[] = [];
  for (const v of [...new Set(vals.map((n) => Math.round(n * 100) / 100))].sort((a, b) => a - b)) {
    if (out.length && v - out[out.length - 1] < 0.6) continue;
    if (split && out.length) {
      const prev = out[out.length - 1];
      const parts = Math.ceil((v - prev) / MAX_ROW_PX);
      for (let i = 1; i < parts; i++) out.push(prev + ((v - prev) * i) / parts);
    }
    out.push(v);
  }
  return out;
}

const nearest = (arr: number[], v: number) => arr.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(arr[best] - v) ? i : best), 0);

function sheetXml(doc: CopyDoc, styles: Styles) {
  const cells = doc.cells.filter((c) => c.fill || c.border || c.text);
  const xs = gridLines([0, ...cells.flatMap((c) => [c.x, c.x + c.w])]);
  const ys = gridLines([0, ...cells.flatMap((c) => [c.y, c.y + c.h])], true);
  const cols = Math.max(0, xs.length - 1), rows = Math.max(0, ys.length - 1);

  const grid = new Map<number, Map<number, string>>();
  const taken = new Set<string>();
  const merges: string[] = [];
  for (const c of cells) {
    const c1 = Math.min(nearest(xs, c.x), cols - 1), r1 = Math.min(nearest(ys, c.y), rows - 1);
    const c2 = Math.min(cols - 1, Math.max(c1, nearest(xs, c.x + c.w) - 1)), r2 = Math.min(rows - 1, Math.max(r1, nearest(ys, c.y + c.h) - 1));
    let free = true;
    for (let r = r1; r <= r2 && free; r++) for (let k = c1; k <= c2; k++) if (taken.has(`${r},${k}`)) { free = false; break; }
    if (!free) continue; // overlapping cell: the first one wins, an overlap would corrupt the file
    const s = styles.xf(c);
    for (let r = r1; r <= r2; r++) {
      const row = grid.get(r) ?? grid.set(r, new Map()).get(r)!;
      for (let k = c1; k <= c2; k++) {
        taken.add(`${r},${k}`);
        const ref = `${colName(k)}${r + 1}`;
        row.set(k, c.text && r === r1 && k === c1
          ? `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.text)}</t></is></c>`
          : `<c r="${ref}" s="${s}"/>`);
      }
    }
    if (r2 > r1 || c2 > c1) merges.push(`${colName(c1)}${r1 + 1}:${colName(c2)}${r2 + 1}`);
  }

  const colsXml = xs.slice(1).map((x, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(0.1, (x - xs[i]) / 7).toFixed(4)}" customWidth="1"/>`).join("");
  const rowsXml = ys.slice(1).map((y, r) => {
    const items = [...(grid.get(r) ?? [])].sort((a, b) => a[0] - b[0]).map((e) => e[1]).join("");
    return `<row r="${r + 1}" ht="${Math.min(409.5, Math.max(0.75, (y - ys[r]) * 0.75)).toFixed(2)}" customHeight="1">${items}</row>`;
  }).join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    (cols && rows ? `<dimension ref="A1:${colName(cols - 1)}${rows}"/>` : "") +
    `<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>` +
    (colsXml ? `<cols>${colsXml}</cols>` : "") +
    `<sheetData>${rowsXml}</sheetData>` +
    (merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "") +
    `<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.3" footer="0.3"/>` +
    `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>`
  );
}

// ---- package ------------------------------------------------------------------------
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = (items: [string, string, string][]) =>
  `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`).join("")}</Relationships>`;

/** Builds the .xlsx file for a diagram. */
export async function buildDiagramXlsx(doc: CopyDoc): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const put = (name: string, data: string, o?: object) => zip.file(name, data, { createFolders: false, ...o });

  // pictures (png / jpeg / gif data URLs only)
  const media: [string, string, string][] = [];
  const imageOf = new Map<string, string>();
  for (const s of doc.shapes) {
    const m = s.img && /^data:image\/(png|jpe?g|gif);base64,(.+)$/s.exec(s.img);
    if (!m) continue;
    const ext = m[1] === "jpg" ? "jpeg" : m[1];
    const rid = `rId${media.length + 1}`;
    put(`xl/media/image${media.length + 1}.${ext}`, m[2], { base64: true });
    media.push([rid, "image", `../media/image${media.length + 1}.${ext}`]);
    imageOf.set(s.id, rid);
  }

  let id = 1;
  const drawing =
    `${XML}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}">` +
    doc.shapes.map((s) => shapeXml(s, ++id, imageOf.get(s.id))).join("") +
    doc.lines.map((l) => lineXml(l, ++id)).join("") +
    `</xdr:wsDr>`;

  const styles = new Styles();
  const sheet = sheetXml(doc, styles);
  const exts = new Set(media.map((m) => m[2].split(".").pop()!));

  put("[Content_Types].xml",
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    [...exts].map((e) => `<Default Extension="${e}" ContentType="image/${e}"/>`).join("") +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  put("_rels/.rels", rels([["rId1", "officeDocument", "xl/workbook.xml"]]));
  put("xl/workbook.xml",
    `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><bookViews><workbookView/></bookViews><sheets><sheet name="المخطط" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  put("xl/_rels/workbook.xml.rels", rels([["rId1", "worksheet", "worksheets/sheet1.xml"], ["rId2", "styles", "styles.xml"]]));
  put("xl/styles.xml", styles.xml());
  put("xl/worksheets/sheet1.xml", sheet);
  put("xl/worksheets/_rels/sheet1.xml.rels", rels([["rId1", "drawing", "../drawings/drawing1.xml"]]));
  put("xl/drawings/drawing1.xml", drawing);
  if (media.length) put("xl/drawings/_rels/drawing1.xml.rels", rels(media));

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** Builds the file and downloads it. Runs entirely in the browser. */
export async function exportDiagramXlsx(doc: CopyDoc, title: string) {
  const url = URL.createObjectURL(await buildDiagramXlsx(doc));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || doc.title || "مخطط").replace(/[\\/:*?"<>|]+/g, " ").trim()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
