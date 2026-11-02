// Trial export: the whole guide (every category, its services, their labels, flowcharts and pictures) as one PDF.
// It lays each service out like the guide page does (same column rules, same label rows) on A3 landscape, then
// prints the result from a hidden iframe: the user saves it with "Save as PDF".
// Delete this file and its button in home.tsx to drop it.
import { renderToStaticMarkup } from "react-dom/server";
import { Drawing } from "@/components/flowchart/copy-canvas";
import { isCopyDoc } from "@/components/flowchart/types";
import {
  DEFAULT_LABEL_COLOR,
  diagramColor,
  divisionTitle,
  flowchartTitle,
  guideApi,
  serviceTitle,
  uploadUrl,
  type ServiceDetail,
  type TreeDivision,
} from "@/lib/guide-api";
import { columnHTML, paginate, type FlowEntry } from "@/lib/guide-flow";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Log initialization of PDF.js worker
console.log("[PDF Export] Initializing PDF.js worker URL:", pdfWorkerUrl);
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const divisionPdfAssets = import.meta.glob<string>("@/assets/**/*.pdf", {
  eager: true,
  import: "default",
  query: "?url",
  caseSensitive: false,
});

console.log("[PDF Export] Loaded PDF Glob Assets:", divisionPdfAssets);

type Diagram = { title: string; svg: string };
// Store rendered introductory PDF pages alongside each division.
type Loaded = {
  division: TreeDivision;
  introPages: string[];
  services: { detail: ServiceDetail; diagrams: Diagram[] }[];
}[];

const SHEET = 1506;
const PAD = 16;
const GAP = 12;
const COL_WIDTH = (SHEET - 2 - PAD * 2 - GAP) / 2;
const COL_HEIGHT = 880;
const PRINT_PAGE_WIDTH = "420mm";
const PRINT_PAGE_HEIGHT = "297mm";
const PRINT_PAGE_SIZE = `${PRINT_PAGE_WIDTH} ${PRINT_PAGE_HEIGHT}`;

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function normalizeDivisionName(value: string): string {
  const normalized = value
    .replace(/\.pdf$/i, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); 
  return normalized;
}

const divisionPdfByName = new Map<string, string>();

// Log mapping of division assets to normalized keys
for (const [path, url] of Object.entries(divisionPdfAssets)) {
  const filename = path.split("/").pop() ?? path;
  const key = normalizeDivisionName(filename);
  console.log(`[PDF Export] Mapping asset key: "${key}" (from path: "${path}") -> URL: "${url}"`);
  divisionPdfByName.set(key, url);
}

function getPdfUrlByName(name: string): string | null {
  const key = normalizeDivisionName(name);
  const url = divisionPdfByName.get(key);
  if (!url) {
    console.warn(`[PDF Export] Warning: Asset PDF "${name}" (key: "${key}") not found.`);
  }
  return url ?? null;
}

function getDivisionPdfUrl(divisionName: string): string | null {
  const key = normalizeDivisionName(divisionName);
  console.log(`[PDF Export] Resolving division PDF URL for name "${divisionName}" (key: "${key}")`);

  if (key === "it" || key === "informationtechnology") {
    console.log(`[PDF Export] Skipping PDF insertion for IT division ("${divisionName}")`);
    return null;
  }

  return getPdfUrlByName(divisionName);
}

async function renderPdfPages(pdfUrl: string, keepPortrait = false): Promise<string[]> {
  console.log(`[PDF Export] Starting renderPdfPages for URL: ${pdfUrl} (keepPortrait: ${keepPortrait})`);
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });

  try {
    const pdf = await loadingTask.promise;
    console.log(`[PDF Export] Loaded PDF successfully (${pdf.numPages} pages) for URL: ${pdfUrl}`);

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      console.log(`[PDF Export] Processing page ${pageNumber}/${pdf.numPages} for URL: ${pdfUrl}`);
      const page = await pdf.getPage(pageNumber);

      try {
        const baseViewport = page.getViewport({ scale: 1 });
        const MAX_PIXELS = 18_000_000;
        const MAX_DIMENSION = 8192;
        const DESIRED_SCALE = 2.5;

        // Check if page is in portrait orientation
        const isPortrait = baseViewport.height > baseViewport.width;
        const shouldRotate = isPortrait && !keepPortrait;

        const scale = Math.min(
          DESIRED_SCALE,
          Math.sqrt(
            MAX_PIXELS /
            (baseViewport.width * baseViewport.height)
          ),
          MAX_DIMENSION /
          Math.max(baseViewport.width, baseViewport.height)
        );

        console.log(`[PDF Export] Page ${pageNumber} scale: ${scale} (isPortrait: ${isPortrait}, rotated: ${shouldRotate})`);

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");

        // Swap canvas dimensions if rotated
        if (shouldRotate) {
          canvas.width = Math.ceil(viewport.height);
          canvas.height = Math.ceil(viewport.width);
        } else {
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
        }

        try {
          console.log(`[PDF Export] Rendering page ${pageNumber} to canvas (${canvas.width}x${canvas.height})...`);

          const renderContext = shouldRotate
            ? {
              canvas,
              viewport,
              transform: [0, 1, -1, 0, viewport.height, 0],
              intent: "print",
            }
            : {
              canvas,
              viewport,
              intent: "print",
            };

          await page.render(renderContext).promise;

          const dataUrl = canvas.toDataURL("image/png");
          console.log(`[PDF Export] Page ${pageNumber} rendered to dataURL (length: ${dataUrl.length} chars)`);
          pages.push(dataUrl);

        } catch (renderErr) {
          console.error(`[PDF Export] Error rendering page ${pageNumber}:`, renderErr);
          throw renderErr;
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }

      } finally {
        page.cleanup();
        console.log(`[PDF Export] Cleaned up page ${pageNumber}`);
      }
    }

    console.log(`[PDF Export] Finished rendering all ${pages.length} pages for PDF: ${pdfUrl}`);
    return pages;

  } catch (pdfErr) {
    console.error(`[PDF Export] Error in renderPdfPages for URL ${pdfUrl}:`, pdfErr);
    throw pdfErr;
  } finally {
    await loadingTask.destroy();
    console.log(`[PDF Export] Destroyed PDF loading task for URL: ${pdfUrl}`);
  }
}

/** Runs `task` over `items`, `limit` at a time, keeping the order of the results. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  console.log(`[PDF Export] Pool starting. Total items: ${items.length}, Concurrency limit: ${limit}`);
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async (_, workerId) => {
      while (next < items.length) {
        const i = next++;
        console.log(`[PDF Export] [Pool Worker ${workerId}] Processing item index ${i}`);
        out[i] = await task(items[i]);
      }
    }),
  );
  console.log(`[PDF Export] Pool completed for ${items.length} items.`);
  return out;
}

async function loadService(id: number) {
  console.log(`[PDF Export] Loading service detail for ID: ${id}`);
  const detail = await guideApi.service(id);
  console.log(`[PDF Export] Loaded detail for service "${detail.name}" (ID: ${id}). Loading ${detail.flowcharts.length} flowcharts...`);

  const diagrams = await Promise.all(
    detail.flowcharts.map(async (f): Promise<Diagram | null> => {
      console.log(`[PDF Export] Fetching flowchart ID: ${f.id} for service ID: ${id}`);
      const doc = await guideApi.flowchart(f.id).catch((err) => {
        console.warn(`[PDF Export] Failed to fetch flowchart ID ${f.id}:`, err);
        return null;
      });
      if (!isCopyDoc(doc) || doc.shapes.length === 0) {
        console.warn(`[PDF Export] Flowchart ID ${f.id} is empty or invalid doc format.`);
        return null;
      }
      const svg = renderToStaticMarkup(
        <svg viewBox={`0 0 ${doc.width} ${doc.height}`} role="img">
          <Drawing doc={doc} color={diagramColor(detail)} />
        </svg>,
      );
      console.log(`[PDF Export] Rendered flowchart SVG for ID: ${f.id}`);
      return { title: flowchartTitle(f, "مخطط سير الإجراء"), svg };
    }),
  );

  const filteredDiagrams = diagrams.filter((d): d is Diagram => d !== null);
  console.log(`[PDF Export] Successfully loaded service ID ${id} with ${filteredDiagrams.length} valid diagrams.`);
  return { detail, diagrams: filteredDiagrams };
}

const CSS = `
@page { size: ${PRINT_PAGE_SIZE}; margin: 10mm 10mm 14mm; @bottom-center { content: counter(page); font: 10pt "Segoe UI", Tahoma, Arial, sans-serif; color: #666; } }
@page full-page { size: ${PRINT_PAGE_SIZE}; margin: 0; }
html, body { background: #fff !important; background-image: none !important; color: #111; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; width: ${SHEET}px; }
.cover { height: 255mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 24px; break-after: page; }
.cover h1 { font-size: 64px; margin: 0; color: ${DEFAULT_LABEL_COLOR}; }
.cover p { font-size: 28px; margin: 0; color: #555; }
.toc { break-after: page; }
.toc h2 { color: ${DEFAULT_LABEL_COLOR}; font-size: 32px; }
.toc .cols { column-count: 3; column-gap: 40px; }
.toc h3 { margin: 18px 0 4px; font-size: 18px; break-after: avoid; }
.toc ul { margin: 0; padding-inline-start: 22px; font-size: 14px; line-height: 1.7; }
.toc a { color: inherit; text-decoration: none; }

.division { break-before: page; }
.division > h1 { margin: 0 0 20px; padding: 10px 20px; color: #fff; font-size: 30px; border-radius: 8px; }

.division-intro-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${SHEET}px;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  background: #fff;
  break-after: page;
}

.division-intro-page.full-page {
  page: full-page;
  width: ${PRINT_PAGE_WIDTH};
  height: ${PRINT_PAGE_HEIGHT};
  max-width: none;
  margin: 0;
}

.division-intro-page img {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 250mm;
  object-fit: contain;
}

.division-intro-page.full-page img {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: fill;
}

.division-intro-page.portrait-page img {
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 260mm;
}

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
  console.log(`[PDF Export] Generating service HTML for service ID ${detail.id} ("${detail.name}")`);
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

function renderHtmlPages(pages: string[], layout: "full-page" | "portrait" = "full-page"): string {
  return pages
    .map(
      (src, index) =>
        `<div class="division-intro-page ${layout === "portrait" ? "portrait-page" : "full-page"}">
          <img src="${esc(src)}" alt="page ${index + 1}">
        </div>`,
    )
    .join("");
}

function documentHtml(
  data: Loaded,
  startPages: { guide1: string[]; guide2_3: string[]; guide6_7: string[] },
  endPages: string[]
): string {
  console.log("[PDF Export] Generating full document HTML string...");

  const startHtml =
    renderHtmlPages(startPages.guide1, "portrait") +
    renderHtmlPages(startPages.guide2_3) +
    renderHtmlPages(startPages.guide6_7);

  const endHtml = renderHtmlPages(endPages, "portrait");

  const toc = data
    .map(
      ({ division, services }) =>
        `<h3><a href="#d${division.id}">${esc(divisionTitle(division, true))}</a></h3><ul>` +
        services.map(({ detail }) => `<li><a href="#s${detail.id}">${esc(serviceTitle(detail.name))}</a></li>`).join("") +
        `</ul>`,
    )
    .join("");

  const body = data
    .map(({ division, introPages, services }) => {
      console.log(`[PDF Export] Formatting division ID ${division.id} ("${division.name}") with ${introPages.length} intro pages`);
      const intro = renderHtmlPages(introPages);

      return (
        `<div class="division" id="d${division.id}">` +
        intro +
        `<h1 style="background:${esc(division.color ?? DEFAULT_LABEL_COLOR)}">${esc(divisionTitle(division, true))}</h1>` +
        services.map(serviceHtml).join("") +
        `</div>`
      );
    })
    .join("");

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'), (n) => n.outerHTML).join("");
  const root = document.documentElement;

  const fullHtml = (
    `<!doctype html><html lang="ar" dir="rtl" class="${esc(root.className.replace(/\bdark\b/g, ""))}" style="${esc(root.getAttribute("style") ?? "")}">` +
    `<head><meta charset="utf-8"><title>دليل الخدمات</title>${styles}<style>${CSS}</style></head><body>` +
    `${startHtml}` +
    `<div class="cover"><h1>دليل الخدمات</h1><p>وزارة الإسكان والتخطيط العمراني</p></div>` +
    `<div class="toc"><h2>الفهرس</h2><div class="cols">${toc}</div></div>${body}` +
    `${endHtml}</body></html>`
  );

  console.log(`[PDF Export] Document HTML generation complete (total character length: ${fullHtml.length})`);
  return fullHtml;
}

let frame: HTMLIFrameElement | null = null;

/** Loads the whole guide and opens the print dialog on it. `onProgress` gets (done, total) while services load. */
export async function exportGuidePdf(onProgress?: (done: number, total: number) => void) {
  console.log("[PDF Export] Starting exportGuidePdf execution...");

  try {
    console.log("[PDF Export] Fetching tree structure from guideApi...");
    const tree = await guideApi.tree();
    console.log(`[PDF Export] Fetched tree with ${tree.length} divisions.`);

    const ids = tree.flatMap((d) => d.services.map((s) => s.id));
    console.log(`[PDF Export] Total service IDs to load: ${ids.length}`);

    // Fetch fixed start/end standalone PDFs
    const g1Url = getPdfUrlByName("guide1");
    const g2_3Url = getPdfUrlByName("guide2-3");
    const g6_7Url = getPdfUrlByName("guide6-7");
    const g223Url = getPdfUrlByName("guide223");

    console.log("[PDF Export] Rendering fixed start/end PDFs...");
    const [guide1Pages, guide2_3Pages, guide6_7Pages, guide223Pages] = await Promise.all([
      g1Url ? renderPdfPages(g1Url, true) : Promise.resolve([]),
      g2_3Url ? renderPdfPages(g2_3Url, false) : Promise.resolve([]),
      g6_7Url ? renderPdfPages(g6_7Url, false) : Promise.resolve([]),
      g223Url ? renderPdfPages(g223Url, true) : Promise.resolve([]),
    ]);

    // Find and render the introductory PDF pages for each division.
    const introAssets = tree.flatMap((division) => {
      const url = getDivisionPdfUrl(division.name);
      return url ? [[division.id, url] as const] : [];
    });

    console.log(`[PDF Export] Division PDF assets to render: ${introAssets.length}`, introAssets);

    // Render at most two division PDFs concurrently to control memory usage.
    console.log("[PDF Export] Starting pool rendering of division introductory PDFs...");
    const introEntries = await pool(
      introAssets,
      2,
      async ([divisionId, url]) => {
        console.log(`[PDF Export] Pool rendering division ID: ${divisionId}`);
        const rendered = await renderPdfPages(url, false);
        return [divisionId, rendered] as const;
      },
    );

    const introPagesByDivision = new Map(introEntries);
    console.log("[PDF Export] Introductory division PDF rendering finished.");

    let done = 0;
    onProgress?.(0, ids.length);

    console.log("[PDF Export] Starting pool loading of all service details...");
    const loaded = new Map(
      await pool(ids, 6, async (id) => {
        const s = await loadService(id);
        done++;
        console.log(`[PDF Export] Progress: ${done}/${ids.length} services loaded.`);
        onProgress?.(done, ids.length);
        return [id, s] as const;
      }),
    );

    console.log("[PDF Export] Assembling Loaded data structure...");
    const data: Loaded = tree.map((division) => ({
      division,
      introPages: introPagesByDivision.get(division.id) ?? [],
      services: division.services.map((s) => loaded.get(s.id)!),
    }));

    console.log("[PDF Export] Checking document fonts status...");
    await document.fonts?.ready;
    console.log("[PDF Export] Document fonts are ready.");

    const html = documentHtml(
      data,
      {
        guide1: guide1Pages,
        guide2_3: guide2_3Pages,
        guide6_7: guide6_7Pages,
      },
      guide223Pages
    );

    if (frame) {
      console.log("[PDF Export] Cleaning up existing print iframe...");
      frame.remove();
    }

    console.log("[PDF Export] Creating print iframe...");
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    frame = iframe;

    const win = iframe.contentWindow;
    if (!win) {
      console.error("[PDF Export] Error: contentWindow of iframe is null");
      throw new Error("Could not access iframe content window.");
    }

    console.log("[PDF Export] Writing HTML content to iframe...");
    win.document.open();
    win.document.write(html);
    win.document.close();
    console.log("[PDF Export] Iframe document written and closed.");

    console.log("[PDF Export] Waiting for iframe window load event / complete state...");
    await new Promise((r) => {
      if (win.document.readyState === "complete") {
        console.log("[PDF Export] Iframe document readyState is already 'complete'.");
        r(null);
      } else {
        win.addEventListener("load", () => {
          console.log("[PDF Export] Iframe window 'load' event fired.");
          r(null);
        }, { once: true });
      }
    });

    console.log("[PDF Export] Checking iframe fonts ready status...");
    await win.document.fonts?.ready;
    console.log("[PDF Export] Iframe fonts are ready.");

    console.log(`[PDF Export] Waiting for ${win.document.images.length} images in iframe to finish loading...`);
    await Promise.all(
      Array.from(win.document.images, (img, index) => {
        if (img.complete) {
          console.log(`[PDF Export] Image ${index + 1}/${win.document.images.length} already complete (src: ${img.src.slice(0, 50)}...)`);
          return null;
        }
        return new Promise((r) => {
          img.onload = () => {
            console.log(`[PDF Export] Image ${index + 1}/${win.document.images.length} loaded successfully.`);
            r(null);
          };
          img.onerror = (err) => {
            console.warn(`[PDF Export] Image ${index + 1}/${win.document.images.length} failed to load:`, err);
            r(null);
          };
        });
      }),
    );
    console.log("[PDF Export] All iframe images loaded/resolved.");

    console.log("[PDF Export] Triggering window print dialog...");
    win.focus();
    win.print();
    console.log("[PDF Export] exportGuidePdf process completed successfully!");

  } catch (exportErr) {
    console.error("[PDF Export] CRITICAL FAILURE during PDF Export execution:", exportErr);
    throw exportErr;
  }
}