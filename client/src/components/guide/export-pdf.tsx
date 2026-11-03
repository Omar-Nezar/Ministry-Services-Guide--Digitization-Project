// Builds the complete guide in a hidden frame and opens the browser print dialog.
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

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const divisionPdfAssets = import.meta.glob<string>("@/assets/**/*.pdf", {
    eager: true,
    import: "default",
    query: "?url",
    caseSensitive: false,
});

type Diagram = { title: string; svg: string };
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
const PRINT_TITLE = "Ministry Services Guide";

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

for (const [path, url] of Object.entries(divisionPdfAssets)) {
    const filename = path.split("/").pop() ?? path;
    const key = normalizeDivisionName(filename);
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
    if (key === "it" || key === "informationtechnology") {
        return null;
    }

    return getPdfUrlByName(divisionName);
}

async function renderPdfPages(pdfUrl: string, keepPortrait = false): Promise<string[]> {
    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });

    try {
        const pdf = await loadingTask.promise;

        const pages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
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

                    pages.push(canvas.toDataURL("image/png"));
                } finally {
                    canvas.width = 0;
                    canvas.height = 0;
                }

            } finally {
                page.cleanup();
            }
        }

        return pages;

    } catch (pdfErr) {
        console.error(`[PDF Export] Error in renderPdfPages for URL ${pdfUrl}:`, pdfErr);
        throw pdfErr;
    } finally {
        await loadingTask.destroy();
    }
}

/** Runs `task` over `items`, `limit` at a time, keeping the order of the results. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let nextIndex = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (nextIndex < items.length) {
                const index = nextIndex++;
                out[index] = await task(items[index]);
            }
        }),
    );
    return out;
}

async function loadService(id: number) {
    const detail = await guideApi.service(id);

    const diagrams = await Promise.all(
        detail.flowcharts.map(async (f): Promise<Diagram | null> => {
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
            return { title: flowchartTitle(f, "مخطط سير الإجراء"), svg };
        }),
    );

    const filteredDiagrams = diagrams.filter((d): d is Diagram => d !== null);
    return { detail, diagrams: filteredDiagrams };
}

const CSS = `
@page { size: ${PRINT_PAGE_SIZE}; margin: 10mm 10mm 14mm; @bottom-center { content: counter(page); font: 10pt "Segoe UI", Tahoma, Arial, sans-serif; color: #666; } }
@page full-page { size: ${PRINT_PAGE_SIZE}; margin: 0; }
html, body { background: #fff !important; background-image: none !important; color: #111; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; }
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
        `<head><meta charset="utf-8"><title>${PRINT_TITLE}</title>${styles}<style>${CSS}</style></head><body>` +
        `${startHtml}` +
        `<div class="cover"><h1>دليل الخدمات</h1><p>وزارة الإسكان والتخطيط العمراني</p></div>` +
        `<div class="toc"><h2>الفهرس</h2><div class="cols">${toc}</div></div>${body}` +
        `${endHtml}</body></html>`
    );

    return fullHtml;
}

let frame: HTMLIFrameElement | null = null;

/** Loads the whole guide and opens the print dialog on it. `onProgress` gets (done, total) while services load. */
export async function exportGuidePdf(onProgress?: (done: number, total: number) => void) {
    try {
        const tree = await guideApi.tree();

        const ids = tree.flatMap((d) => d.services.map((s) => s.id));

        // Fetch fixed start/end standalone PDFs
        const g1Url = getPdfUrlByName("guide1");
        const g2_3Url = getPdfUrlByName("guide2-3");
        const g6_7Url = getPdfUrlByName("guide6-7");
        const g223Url = getPdfUrlByName("guide223");

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

        // Render at most two division PDFs concurrently to control memory usage.
        const introEntries = await pool(
            introAssets,
            2,
            async ([divisionId, url]) => {
                const rendered = await renderPdfPages(url, false);
                return [divisionId, rendered] as const;
            },
        );

        const introPagesByDivision = new Map(introEntries);

        let done = 0;
        onProgress?.(0, ids.length);

        const loaded = new Map(
            await pool(ids, 6, async (id) => {
                const s = await loadService(id);
                done++;
                onProgress?.(done, ids.length);
                return [id, s] as const;
            }),
        );

        const data: Loaded = tree.map((division) => ({
            division,
            introPages: introPagesByDivision.get(division.id) ?? [],
            services: division.services.map((s) => loaded.get(s.id)!),
        }));

        await document.fonts?.ready;

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
            frame.remove();
        }

        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
        document.body.appendChild(iframe);
        frame = iframe;

        const win = iframe.contentWindow;
        if (!win) {
            throw new Error("Could not access iframe content window.");
        }

        win.document.open();
        win.document.write(html);
        win.document.close();

        await new Promise((r) => {
            if (win.document.readyState === "complete") {
                r(null);
            } else {
                win.addEventListener("load", () => {
                    r(null);
                }, { once: true });
            }
        });

        await win.document.fonts?.ready;

        await Promise.all(
            Array.from(win.document.images, (img) => {
                if (img.complete) {
                    if (img.naturalWidth === 0) {
                        throw new Error(`Failed to load image: ${img.currentSrc || img.src}`);
                    }
                    return null;
                }
                return new Promise<void>((resolve, reject) => {
                    img.addEventListener("load", () => resolve(), { once: true });
                    img.addEventListener("error", () => {
                        reject(new Error(`Failed to load image: ${img.currentSrc || img.src}`));
                    }, { once: true });
                });
            }),
        );

        win.addEventListener("afterprint", () => {
            if (frame === iframe) frame = null;
            iframe.remove();
        }, { once: true });
        win.focus();
        win.print();

    } catch (exportErr) {
        console.error("[PDF Export] CRITICAL FAILURE during PDF Export execution:", exportErr);
        throw exportErr;
    }
}