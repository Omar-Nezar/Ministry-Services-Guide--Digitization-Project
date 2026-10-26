import DOMPurify from "dompurify";

export type FlowEntry = { key: string; name: string; color: string; html: string };
/** A label row inside one column. `cont` = the label's text continues from the previous column. */
export type Seg = { label: string; color: string; cont: boolean; units: string[] };
export type FlowColumn = Seg[];

const ROW = "flex overflow-hidden rounded-md border";
const LABEL_CELL = "shrink-0 p-3 text-sm font-bold text-white";
const INFO_CELL = "min-w-0 flex-1 bg-muted/40 p-3";
const LABEL_WIDTH = "max(28%, 6rem)";

/** True when the html has no text, picture or table (an empty Tiptap document is "<p></p>"). */
export function isEmptyHtml(html: string): boolean {
  return !/<(img|table|hr)\b/i.test(html) && html.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/g, " ").trim() === "";
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** The text that goes between "continued" rows: Arabic, like the content. */
const CONTINUED = "تابع / ";

export function segHTML(seg: Seg) {
  const name = (seg.cont ? CONTINUED : "") + seg.label;
  return `<div class="${ROW}"><div class="${LABEL_CELL}" style="width:${LABEL_WIDTH};background:${seg.color}">${esc(name)}</div><div class="${INFO_CELL}"><div class="rich-content">${seg.units.join("")}</div></div></div>`;
}

export const columnHTML = (col: FlowColumn) => col.map(segHTML).join("");

/** Splits a label's html into the smallest pieces that may land in different columns: blocks, and list items. */
function toUnits(html: string): string[] {
  if (isEmptyHtml(html)) return [`<p class="text-sm text-muted-foreground/70">—</p>`];
  const tpl = document.createElement("template");
  tpl.innerHTML = DOMPurify.sanitize(html);
  const out: string[] = [];
  for (const el of Array.from(tpl.content.children)) {
    if (el.tagName === "UL" || el.tagName === "OL") {
      const start = el.tagName === "OL" ? Number(el.getAttribute("start") ?? 1) : 0;
      Array.from(el.children).forEach((li, i) => {
        const wrap = el.cloneNode(false) as HTMLElement;
        if (el.tagName === "OL") wrap.setAttribute("start", String(start + i));
        wrap.appendChild(li.cloneNode(true));
        out.push(wrap.outerHTML);
      });
    } else out.push(el.outerHTML);
  }
  return out;
}

/**
 * Pours the labels into columns of `colWidth` px that hold at most `maxHeight` px, measuring real DOM.
 * A label that does not fit is continued at the top of the next column.
 * Pass `maxHeight = Infinity` for a single unbroken column.
 */
export function paginate(entries: FlowEntry[], colWidth: number, maxHeight: number): FlowColumn[] {
  const probe = document.createElement("div");
  probe.className = "flex flex-col gap-1.5";
  probe.dir = "rtl";
  probe.style.cssText = `position:absolute;visibility:hidden;left:-99999px;top:0;width:${colWidth}px`;
  document.body.appendChild(probe);
  const height = (col: FlowColumn) => {
    probe.innerHTML = columnHTML(col);
    return probe.offsetHeight;
  };

  const cols: FlowColumn[] = [[]];
  try {
    for (const e of entries) {
      let seg: Seg = { label: e.name, color: e.color, cont: false, units: [] };
      cols[cols.length - 1]!.push(seg);
      for (const unit of toUnits(e.html)) {
        seg.units.push(unit);
        const col = cols[cols.length - 1]!;
        if (height(col) <= maxHeight || (col.length === 1 && seg.units.length === 1)) continue;
        // Overflow: move this unit to a fresh column
        seg.units.pop();
        const started = seg.units.length > 0;
        if (!started) col.pop();
        seg = { label: e.name, color: e.color, cont: started || seg.cont, units: [unit] };
        cols.push([seg]);
      }
    }
  } finally {
    probe.remove();
  }
  return cols;
}
