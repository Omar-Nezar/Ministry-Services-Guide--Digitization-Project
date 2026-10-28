// Trial export: the whole guide (every category, its services, their labels, flowcharts and pictures) as one PDF.
// It lays each service out like the guide page does (same column rules, same label rows) on A3 landscape, then
// prints the result from a hidden iframe: the user saves it with "Save as PDF".
// Delete this file and its button in home.tsx to drop it.
import { renderToStaticMarkup } from "react-dom/server";
import { Drawing } from "@/components/flowchart/copy-canvas";
import { isCopyDoc } from "@/components/flowchart/types";
import {
  DEFAULT_LABEL_COLOR,
  divisionTitle,
  flowchartTitle,
  guideApi,
  serviceTitle,
  uploadUrl,
  type ServiceDetail,
  type TreeDivision,
} from "@/lib/guide-api";
import { columnHTML, paginate, type FlowEntry } from "@/lib/guide-flow";

type Diagram = { title: string; svg: string };
type Loaded = { division: TreeDivision; services: { detail: ServiceDetail; diagrams: Diagram[] }[] }[];

// The guide page puts 2 columns on a sheet (each column is a label cell + a text cell) and starts a new sheet when
// they are full. Here a sheet is one A3 landscape page (400mm of printable width = 1506px at 96dpi, the 6px left over).
const SHEET = 1506;
const PAD = 16;
const GAP = 12;
const COL_WIDTH = (SHEET - 2 - PAD * 2 - GAP) / 2;
const COL_HEIGHT = 880; // what is left of the page height under the service title

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Runs `task` over `items`, `limit` at a time, keeping the order of the results. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await task(items[i]);
      }
    }),
  );
  return out;
}

async function loadService(id: number) {
  const detail = await guideApi.service(id);
  const diagrams = await Promise.all(
    detail.flowcharts.map(async (f): Promise<Diagram | null> => {
      const doc = await guideApi.flowchart(f.id).catch(() => null);
      if (!isCopyDoc(doc) || doc.shapes.length === 0) return null;
      const svg = renderToStaticMarkup(
        <svg viewBox={`0 0 ${doc.width} ${doc.height}`} role="img">
          <Drawing doc={doc} />
        </svg>,
      );
      return { title: flowchartTitle(f, "مخطط سير الإجراء"), svg };
    }),
  );
  return { detail, diagrams: diagrams.filter((d): d is Diagram => d !== null) };
}

// Comes after the app's own stylesheets (copied in), which style the label rows and the text.
const CSS = `
@page { size: A3 landscape; margin: 10mm 10mm 14mm; @bottom-center { content: counter(page); font: 10pt "Segoe UI", Tahoma, Arial, sans-serif; color: #666; } }
html, body { background: #fff !important; background-image: none !important; color: #111; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; width: ${SHEET}px; }
.cover { height: 255mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 24px; }
.cover h1 { font-size: 64px; margin: 0; color: ${DEFAULT_LABEL_COLOR}; }
.cover p { font-size: 28px; margin: 0; color: #555; }
.toc { break-before: page; }
.toc h2 { color: ${DEFAULT_LABEL_COLOR}; font-size: 32px; }
.toc .cols { column-count: 3; column-gap: 40px; }
.toc h3 { margin: 18px 0 4px; font-size: 18px; break-after: avoid; }
.toc ul { margin: 0; padding-inline-start: 22px; font-size: 14px; line-height: 1.7; }
.toc a { color: inherit; text-decoration: none; }
.division { break-before: page; }
.division > h1 { margin: 0 0 20px; padding: 10px 20px; color: #fff; font-size: 30px; border-radius: 8px; }
.service + .service { break-before: page; }
.service > h2 { margin: 0 0 14px; font-size: 26px; line-height: 1.5; break-after: avoid; }
.flow-page { display: flex; gap: ${GAP}px; width: ${SHEET}px; padding: ${PAD}px; border: 1px solid var(--border, #ddd); border-radius: 8px; break-inside: avoid; }
.flow-page + .flow-page { break-before: page; }
.flow-page > .slot { display: flex; flex-direction: column; flex: 1 1 0; min-width: 0; gap: 6px; }
.sub { margin: 18px 0 8px; font-size: 20px; color: ${DEFAULT_LABEL_COLOR}; break-after: avoid; }
.figure { width: ${SHEET}px; break-inside: avoid; margin: 0 0 16px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
.figure h4 { margin: 0 0 8px; font-size: 16px; color: ${DEFAULT_LABEL_COLOR}; }
.figure svg { display: block; width: 100%; height: auto; max-height: 800px; background: #fff; }
.figure img { display: block; max-width: 100%; max-height: 800px; margin: 0 auto; object-fit: contain; }
.figure figcaption { text-align: center; font-size: 14px; color: #555; margin-top: 6px; }
`;

function serviceHtml({ detail, diagrams }: Loaded[number]["services"][number]): string {
  const entries: FlowEntry[] = detail.labels.map((l) => ({ key: l.key, name: l.name, color: l.color ?? DEFAULT_LABEL_COLOR, html: l.html }));
  const cols = paginate(entries, COL_WIDTH, COL_HEIGHT);
  const sheets = Array.from({ length: Math.ceil(cols.length / 2) }, (_, i) => cols.slice(i * 2, i * 2 + 2))
    .map((pair) => `<div class="flow-page">${[0, 1].map((slot) => `<div class="slot">${pair[slot] ? columnHTML(pair[slot]) : ""}</div>`).join("")}</div>`)
    .join("");
  const flow = diagrams.length
    ? `<h3 class="sub">مخطط سير الإجراء</h3>` + diagrams.map((d) => `<div class="figure"><h4>${esc(d.title)}</h4>${d.svg}</div>`).join("")
    : "";
  const pictures = detail.images.length
    ? `<h3 class="sub">الصور</h3>` +
      detail.images
        .map(
          (i) =>
            `<figure class="figure"><img src="${esc(uploadUrl(i.imagePath))}" alt="">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`,
        )
        .join("")
    : "";
  return `<section class="service" id="s${detail.id}"><h2 style="color:${esc(detail.serviceDivision.color ?? DEFAULT_LABEL_COLOR)}">${esc(serviceTitle(detail.name))}</h2>${sheets}${flow}${pictures}</section>`;
}

function documentHtml(data: Loaded): string {
  const toc = data
    .map(
      ({ division, services }) =>
        `<h3><a href="#d${division.id}">${esc(divisionTitle(division, true))}</a></h3><ul>` +
        services.map(({ detail }) => `<li><a href="#s${detail.id}">${esc(serviceTitle(detail.name))}</a></li>`).join("") +
        `</ul>`,
    )
    .join("");
  const body = data
    .map(
      ({ division, services }) =>
        `<div class="division" id="d${division.id}"><h1 style="background:${esc(division.color ?? DEFAULT_LABEL_COLOR)}">${esc(divisionTitle(division, true))}</h1>` +
        services.map(serviceHtml).join("") +
        `</div>`,
    )
    .join("");
  // the app's own stylesheets, so the label rows and text look as they do in the guide (Tailwind classes, --border, ...)
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'), (n) => n.outerHTML).join("");
  const root = document.documentElement;
  return (
    `<!doctype html><html lang="ar" dir="rtl" class="${esc(root.className.replace(/\bdark\b/g, ""))}" style="${esc(root.getAttribute("style") ?? "")}">` +
    `<head><meta charset="utf-8"><title>دليل الخدمات</title>${styles}<style>${CSS}</style></head><body>` +
    `<div class="cover"><h1>دليل الخدمات</h1><p>وزارة الإسكان والتخطيط العمراني</p></div>` +
    `<div class="toc"><h2>الفهرس</h2><div class="cols">${toc}</div></div>${body}</body></html>`
  );
}

let frame: HTMLIFrameElement | null = null;

/** Loads the whole guide and opens the print dialog on it. `onProgress` gets (done, total) while services load. */
export async function exportGuidePdf(onProgress?: (done: number, total: number) => void) {
  const tree = await guideApi.tree();
  const ids = tree.flatMap((d) => d.services.map((s) => s.id));
  let done = 0;
  onProgress?.(0, ids.length);
  const loaded = new Map(
    await pool(ids, 6, async (id) => {
      const s = await loadService(id);
      onProgress?.(++done, ids.length);
      return [id, s] as const;
    }),
  );
  const data: Loaded = tree.map((division) => ({ division, services: division.services.map((s) => loaded.get(s.id)!) }));

  await document.fonts?.ready; // the columns are measured in this page, so the fonts must be in
  const html = documentHtml(data);

  frame?.remove();
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  frame = iframe;
  const win = iframe.contentWindow!;
  win.document.open();
  win.document.write(html);
  win.document.close();

  // print only once the stylesheets, fonts and pictures are in, or they come out blank or unstyled
  await new Promise((r) => (win.document.readyState === "complete" ? r(null) : win.addEventListener("load", () => r(null), { once: true })));
  await win.document.fonts?.ready;
  await Promise.all(
    Array.from(win.document.images, (img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
  );
  win.focus();
  win.print();
}
