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
    type PdfPage,
    type ServiceDetail,
    type TreeDivision,
} from "@/lib/guide-api";
import { columnHTML, paginate, type FlowEntry } from "@/lib/guide-flow";
type Diagram = { title: string; svg: string };
type Loaded = {
    division: TreeDivision;
    services: { detail: ServiceDetail; diagrams: Diagram[] }[];
}[];

const SHEET = 1506;
const PAD = 16;
const GAP = 12;
const COL_WIDTH = (SHEET - 2 - PAD * 2 - GAP) / 2;
const COL_HEIGHT = 880;
const PRINT_PAGE_SIZE = "420mm 297mm";
const PRINT_TITLE = "Ministry Services Guide";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
@page a4-portrait { size: A4 portrait; margin: 0; }
@page a4-landscape { size: A4 landscape; margin: 0; }
@page a3-portrait { size: A3 portrait; margin: 0; }
@page a3-landscape { size: A3 landscape; margin: 0; }
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

.custom-page { position: relative; break-before: page; break-after: page; overflow: hidden; background: #fff; }
.custom-page img { display: block; width: 100%; height: 100%; }
.custom-page img.turned { position: absolute; left: 50%; top: 50%; }
.custom-page.a4-portrait { page: a4-portrait; width: 210mm; height: 297mm; }
.custom-page.a4-landscape { page: a4-landscape; width: 297mm; height: 210mm; }
.custom-page.a3-portrait { page: a3-portrait; width: 297mm; height: 420mm; }
.custom-page.a3-landscape { page: a3-landscape; width: 420mm; height: 297mm; }

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

/** The pictures an admin added, as full pages of their own size (A4 or A3). */
function customPagesHtml(pages: PdfPage[]): string {
    return pages
        .map((p) => {
            // A quarter turn swaps the picture's box (page height x page width) so it still fills the page once turned
            const [w, h] = (p.size === "A3" ? [297, 420] : [210, 297]).sort((a, b) => (p.orientation === "landscape" ? b - a : a - b));
            const quarter = p.rotation === 90 || p.rotation === 270;
            const style =
                `object-fit:${p.imageFit}` +
                (p.rotation === 0
                    ? ""
                    : quarter
                      ? `;width:${h}mm;height:${w}mm;transform:translate(-50%,-50%) rotate(${p.rotation}deg)`
                      : `;transform:rotate(180deg)`);
            const turned = quarter ? ' class="turned"' : "";
            return `<div class="custom-page ${p.size.toLowerCase()}-${p.orientation}"><img${turned} src="${esc(uploadUrl(p.imagePath))}" alt="" style="${style}"></div>`;
        })
        .join("");
}

function documentHtml(
    data: Loaded,
    custom: PdfPage[],
): string {
    const customAt = (slot: PdfPage["slot"], divisionId?: number) =>
        customPagesHtml(custom.filter((p) => p.slot === slot && (divisionId === undefined || p.serviceDivisionId === divisionId)));

    const toc = data
        .map(
            ({ division, services }) =>
                `<h3><a href="#d${division.id}">${esc(divisionTitle(division, true))}</a></h3><ul>` +
                services.map(({ detail }) => `<li><a href="#s${detail.id}">${esc(serviceTitle(detail.name))}</a></li>`).join("") +
                `</ul>`,
        )
        .join("");

    const body = data
        .map(({ division, services }) => {
            return (
                customAt("before", division.id) +
                `<div class="division" id="d${division.id}">` +
                `<h1 style="background:${esc(division.color ?? DEFAULT_LABEL_COLOR)}">${esc(divisionTitle(division, true))}</h1>` +
                services.map(serviceHtml).join("") +
                `</div>` +
                customAt("after", division.id)
            );
        })
        .join("");

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'), (n) => n.outerHTML).join("");
    const root = document.documentElement;

    const fullHtml = (
        `<!doctype html><html lang="ar" dir="rtl" class="${esc(root.className.replace(/\bdark\b/g, ""))}" style="${esc(root.getAttribute("style") ?? "")}">` +
        `<head><meta charset="utf-8"><title>${PRINT_TITLE}</title>${styles}<style>${CSS}</style></head><body>` +
        customAt("start") +
        `<div class="cover"><h1>دليل الخدمات</h1><p>وزارة الإسكان والتخطيط العمراني</p></div>` +
        `<div class="toc"><h2>الفهرس</h2><div class="cols">${toc}</div></div>${body}` +
        `${customAt("end")}</body></html>`
    );

    return fullHtml;
}

let frame: HTMLIFrameElement | null = null;

/** Loads the whole guide and opens the print dialog on it. `onProgress` gets (done, total) while services load. */
export async function exportGuidePdf(onProgress?: (done: number, total: number) => void) {
    try {
        const tree = await guideApi.tree();

        const customPages = await guideApi.pdfPages();

        const ids = tree.flatMap((d) => d.services.map((s) => s.id));

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
            services: division.services.map((s) => loaded.get(s.id)!),
        }));

        await document.fonts?.ready;

        const html = documentHtml(
            data,
            customPages,
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