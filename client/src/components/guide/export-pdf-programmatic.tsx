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
import { createRasterPdf, downloadBlob, rasterizeElement, type RasterPdfPage } from "@/lib/raster-pdf";

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
  introPages: RasterPdfPage[];
  services: { detail: ServiceDetail; diagrams: Diagram[] }[];
}[];

const SHEET = 1506;
const PAGE_HEIGHT = 1064;
const PAGE_SCALE = 2;
const PAD = 16;
const GAP = 12;
const COL_WIDTH = (SHEET - 2 - PAD * 2 - GAP) / 2;
const COL_HEIGHT = 880;
const PAGE_CSS = `
  box-sizing: border-box;
  position: absolute;
  left: -100000px;
  top: 0;
  width: ${SHEET}px;
  height: ${PAGE_HEIGHT}px;
  overflow: hidden;
  background: #fff;
  color: #111;
  direction: rtl;
  font-family: "Geist Variable", "Segoe UI", Tahoma, Arial, sans-serif;
`;

function normalizeDivisionName(value: string): string {
  return value
    .replace(/\.pdf$/i, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const divisionPdfByName = new Map<string, string>();
for (const [path, url] of Object.entries(divisionPdfAssets)) {
  const filename = path.split("/").pop() ?? path;
  divisionPdfByName.set(normalizeDivisionName(filename), url);
}

function getPdfUrlByName(name: string): string | null {
  const url = divisionPdfByName.get(normalizeDivisionName(name));
  if (!url) console.warn(`[PDF Export] Asset PDF "${name}" was not found.`);
  return url ?? null;
}

function getDivisionPdfUrl(name: string): string | null {
  const key = normalizeDivisionName(name);
  if (key === "it" || key === "informationtechnology") return null;
  return getPdfUrlByName(name);
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode a PDF page as JPEG."));
        return;
      }
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/jpeg", 0.92);
  });
}

function fitImage(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function renderPdfPages(
  pdfUrl: string,
  layout: "full-page" | "portrait" = "full-page",
): Promise<RasterPdfPage[]> {
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
  try {
    const pdf = await loadingTask.promise;
    const pages: RasterPdfPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const baseViewport = page.getViewport({ scale: 1 });
        const maxPixels = 18_000_000;
        const maxDimension = 8192;
        const scale = Math.min(
          2.5,
          Math.sqrt(maxPixels / (baseViewport.width * baseViewport.height)),
          maxDimension / Math.max(baseViewport.width, baseViewport.height),
        );
        const viewport = page.getViewport({ scale });
        const shouldRotate = baseViewport.height > baseViewport.width && layout === "full-page";
        const source = document.createElement("canvas");

        if (shouldRotate) {
          source.width = Math.ceil(viewport.height);
          source.height = Math.ceil(viewport.width);
        } else {
          source.width = Math.ceil(viewport.width);
          source.height = Math.ceil(viewport.height);
        }

        await page.render({
          canvas: source,
          viewport,
          ...(shouldRotate ? { transform: [0, 1, -1, 0, viewport.height, 0] } : {}),
          intent: "print",
        }).promise;

        const output = document.createElement("canvas");
        output.width = SHEET * PAGE_SCALE;
        output.height = PAGE_HEIGHT * PAGE_SCALE;
        const context = output.getContext("2d");
        if (!context) throw new Error("Could not create a canvas context for PDF page rendering.");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, output.width, output.height);

        if (layout === "full-page") {
          context.drawImage(source, 0, 0, output.width, output.height);
        } else {
          const maxPortraitHeight = output.height * 260 / 297;
          fitImage(context, source, 0, 0, output.width, maxPortraitHeight);
        }

        pages.push({
          image: await canvasToJpeg(output),
          width: output.width,
          height: output.height,
          showPageNumber: layout === "portrait",
        });
        source.width = 0;
        source.height = 0;
        output.width = 0;
        output.height = 0;
      } finally {
        page.cleanup();
      }
    }

    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await task(items[index]!);
      }
    }),
  );
  return out;
}

async function loadService(id: number) {
  const detail = await guideApi.service(id);
  const diagrams = await Promise.all(
    detail.flowcharts.map(async (flowchart): Promise<Diagram | null> => {
      const doc = await guideApi.flowchart(flowchart.id).catch((error) => {
        console.warn(`[PDF Export] Failed to fetch flowchart ${flowchart.id}:`, error);
        return null;
      });
      if (!isCopyDoc(doc) || doc.shapes.length === 0) {
        console.warn(`[PDF Export] Flowchart ${flowchart.id} is empty or invalid.`);
        return null;
      }

      const svg = renderToStaticMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${doc.width} ${doc.height}`} role="img">
          <Drawing doc={doc} color={diagramColor(detail)} />
        </svg>,
      );
      return { title: flowchartTitle(flowchart, "مخطط سير الإجراء"), svg };
    }),
  );

  return { detail, diagrams: diagrams.filter((diagram): diagram is Diagram => diagram !== null) };
}

function createPage(): HTMLDivElement {
  const page = document.createElement("div");
  page.setAttribute("dir", "rtl");
  page.style.cssText = PAGE_CSS;
  return page;
}

async function waitForImages(element: HTMLElement): Promise<void> {
  await Promise.all(Array.from(element.querySelectorAll("img"), async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => reject(new Error(`Could not load export image: ${image.src}`)), { once: true });
      });
    }
    if (image.naturalWidth === 0) throw new Error(`Could not load export image: ${image.src}`);
  }));
}

async function capturePage(element: HTMLElement, showPageNumber = true): Promise<RasterPdfPage> {
  document.body.appendChild(element);
  try {
    await waitForImages(element);
    const raster = await rasterizeElement(element);
    return { ...raster, showPageNumber };
  } finally {
    element.remove();
  }
}

function appendDivisionHeading(page: HTMLElement, division: TreeDivision): void {
  const heading = document.createElement("h1");
  heading.textContent = divisionTitle(division, true);
  heading.style.cssText = [
    "margin:0 0 20px",
    "padding:10px 20px",
    `background:${division.color ?? DEFAULT_LABEL_COLOR}`,
    "color:#fff",
    "font-size:30px",
    "border-radius:8px",
  ].join(";");
  page.appendChild(heading);
}

function appendServiceHeading(page: HTMLElement, detail: ServiceDetail): void {
  const heading = document.createElement("h2");
  heading.textContent = serviceTitle(detail.name);
  heading.style.cssText = `margin:0 0 14px;font-size:26px;line-height:1.5;color:${detail.serviceDivision.color ?? DEFAULT_LABEL_COLOR}`;
  page.appendChild(heading);
}

function appendSubheading(page: HTMLElement, text: string): void {
  const heading = document.createElement("h3");
  heading.textContent = text;
  heading.style.cssText = `margin:18px 0 8px;font-size:20px;color:${DEFAULT_LABEL_COLOR}`;
  page.appendChild(heading);
}

function appendFlowSheet(page: HTMLElement, columns: ReturnType<typeof paginate>, sheetIndex: number): void {
  const sheet = document.createElement("div");
  sheet.style.cssText = [
    "display:flex",
    `gap:${GAP}px`,
    `width:${SHEET}px`,
    "padding:16px",
    "border:1px solid #ddd",
    "border-radius:8px",
    "box-sizing:border-box",
    "break-inside:avoid",
  ].join(";");

  for (let slot = 0; slot < 2; slot++) {
    const column = document.createElement("div");
    column.style.cssText = "display:flex;flex-direction:column;flex:1 1 0;min-width:0;gap:6px";
    const content = columns[sheetIndex * 2 + slot];
    if (content) column.innerHTML = columnHTML(content);
    sheet.appendChild(column);
  }
  page.appendChild(sheet);
}

function appendFlowchart(page: HTMLElement, diagram: Diagram): void {
  const figure = document.createElement("figure");
  figure.style.cssText = "margin:0;border:1px solid #ddd;border-radius:8px;padding:12px;box-sizing:border-box";
  const title = document.createElement("h4");
  title.textContent = diagram.title;
  title.style.cssText = `margin:0 0 8px;font-size:16px;color:${DEFAULT_LABEL_COLOR}`;
  figure.appendChild(title);

  const container = document.createElement("div");
  container.style.cssText = "width:100%;max-height:800px;background:#fff";
  container.innerHTML = diagram.svg;
  const svg = container.firstElementChild as SVGElement | null;
  if (svg) {
    svg.style.cssText = "display:block;width:100%;height:auto;max-height:800px";
    figure.appendChild(svg);
  }
  page.appendChild(figure);
}

async function appendServiceImage(page: HTMLElement, detail: ServiceDetail, imageIndex: number): Promise<void> {
  const image = detail.images[imageIndex]!;
  const response = await fetch(uploadUrl(image.imagePath));
  if (!response.ok) throw new Error(`Could not fetch service image ${image.imagePath}: ${response.status}`);

  const blob = await response.blob();
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read service image."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read service image."));
    reader.readAsDataURL(blob);
  });

  const figure = document.createElement("figure");
  figure.style.cssText = "margin:0;border:1px solid #ddd;border-radius:8px;padding:12px;box-sizing:border-box";
  const element = document.createElement("img");
  element.src = src;
  element.alt = "";
  element.style.cssText = "display:block;max-width:100%;max-height:800px;margin:0 auto;object-fit:contain";
  figure.appendChild(element);

  if (image.caption) {
    const caption = document.createElement("figcaption");
    caption.textContent = image.caption;
    caption.style.cssText = "text-align:center;font-size:14px;color:#555;margin-top:6px";
    figure.appendChild(caption);
  }
  page.appendChild(figure);
  await waitForImages(figure);
}

async function renderServicePages(
  division: TreeDivision,
  service: Loaded[number]["services"][number],
  includeDivisionHeading: boolean,
): Promise<RasterPdfPage[]> {
  const { detail, diagrams } = service;
  const entries: FlowEntry[] = detail.labels.map((label) => ({
    key: label.key,
    name: label.name,
    color: label.color ?? DEFAULT_LABEL_COLOR,
    html: label.html,
  }));
  const columns = paginate(entries, COL_WIDTH, COL_HEIGHT);
  const flowSheetCount = Math.ceil(columns.length / 2);
  const contentCount = flowSheetCount + diagrams.length + detail.images.length;
  const pages: RasterPdfPage[] = [];

  let isFirstPage = true;
  const addPageHeadings = (page: HTMLElement) => {
    if (isFirstPage && includeDivisionHeading) appendDivisionHeading(page, division);
    if (isFirstPage || contentCount === 0) appendServiceHeading(page, detail);
  };

  for (let index = 0; index < flowSheetCount; index++) {
    const page = createPage();
    addPageHeadings(page);
    appendFlowSheet(page, columns, index);
    pages.push(await capturePage(page));
    isFirstPage = false;
  }

  for (const diagram of diagrams) {
    const page = createPage();
    addPageHeadings(page);
    appendSubheading(page, "مخطط سير الإجراء");
    appendFlowchart(page, diagram);
    pages.push(await capturePage(page));
    isFirstPage = false;
  }

  if (detail.images.length > 0) {
    for (let index = 0; index < detail.images.length; index++) {
      const page = createPage();
      addPageHeadings(page);
      appendSubheading(page, "الصور");
      await appendServiceImage(page, detail, index);
      pages.push(await capturePage(page));
      isFirstPage = false;
    }
  }

  if (contentCount === 0) {
    const page = createPage();
    addPageHeadings(page);
    pages.push(await capturePage(page));
  }

  return pages;
}

async function createCoverPage(): Promise<RasterPdfPage> {
  const page = createPage();
  page.style.cssText += ";display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:24px";

  const title = document.createElement("h1");
  title.textContent = "دليل الخدمات";
  title.style.cssText = `font-size:64px;margin:0;color:${DEFAULT_LABEL_COLOR}`;
  const subtitle = document.createElement("p");
  subtitle.textContent = "وزارة الإسكان والتخطيط العمراني";
  subtitle.style.cssText = "font-size:28px;margin:0;color:#555";
  page.append(title, subtitle);
  return capturePage(page);
}

async function createContentsPage(data: Loaded): Promise<RasterPdfPage> {
  const page = createPage();
  page.style.cssText += ";padding:32px 38px";

  const heading = document.createElement("h2");
  heading.textContent = "الفهرس";
  heading.style.cssText = `color:${DEFAULT_LABEL_COLOR};font-size:32px;margin:0 0 16px`;
  page.appendChild(heading);

  const columns = document.createElement("div");
  columns.style.cssText = "column-count:3;column-gap:40px";
  for (const { division, services } of data) {
    const group = document.createElement("section");
    group.style.cssText = "break-inside:avoid";
    const title = document.createElement("h3");
    title.textContent = divisionTitle(division, true);
    title.style.cssText = "margin:18px 0 4px;font-size:18px";
    group.appendChild(title);
    const list = document.createElement("ul");
    list.style.cssText = "margin:0;padding-inline-start:22px;font-size:14px;line-height:1.7";
    for (const { detail } of services) {
      const item = document.createElement("li");
      item.textContent = serviceTitle(detail.name);
      list.appendChild(item);
    }
    group.appendChild(list);
    columns.appendChild(group);
  }
  page.appendChild(columns);
  return capturePage(page);
}

/** Loads the guide and downloads a composed A3 PDF. `onProgress` gets (done, total) while services load. */
export async function exportGuidePdf(onProgress?: (done: number, total: number) => void): Promise<void> {
  try {
    const tree = await guideApi.tree();
    const serviceIds = tree.flatMap((division) => division.services.map((service) => service.id));

    const guide1Url = getPdfUrlByName("guide1");
    const guide2_3Url = getPdfUrlByName("guide2-3");
    const guide6_7Url = getPdfUrlByName("guide6-7");
    const guide223Url = getPdfUrlByName("guide223");
    const [guide1Pages, guide2_3Pages, guide6_7Pages, guide223Pages] = await Promise.all([
      guide1Url ? renderPdfPages(guide1Url, "portrait") : Promise.resolve([]),
      guide2_3Url ? renderPdfPages(guide2_3Url) : Promise.resolve([]),
      guide6_7Url ? renderPdfPages(guide6_7Url) : Promise.resolve([]),
      guide223Url ? renderPdfPages(guide223Url, "portrait") : Promise.resolve([]),
    ]);

    const introAssets = tree.flatMap((division) => {
      const url = getDivisionPdfUrl(division.name);
      return url ? [[division.id, url] as const] : [];
    });
    const introEntries = await pool(introAssets, 2, async ([divisionId, url]) => [
      divisionId,
      await renderPdfPages(url),
    ] as const);
    const introPagesByDivision = new Map(introEntries);

    let done = 0;
    onProgress?.(0, serviceIds.length);
    const loadedServices = await pool(serviceIds, 6, async (id) => {
      const loaded = await loadService(id);
      done++;
      onProgress?.(done, serviceIds.length);
      return [id, loaded] as const;
    });
    const serviceById = new Map(loadedServices);
    const data: Loaded = tree.map((division) => ({
      division,
      introPages: introPagesByDivision.get(division.id) ?? [],
      services: division.services.map((service) => serviceById.get(service.id)!),
    }));

    const pages: RasterPdfPage[] = [
      ...guide1Pages,
      ...guide2_3Pages,
      ...guide6_7Pages,
      await createCoverPage(),
      await createContentsPage(data),
    ];

    for (const { division, introPages, services } of data) {
      pages.push(...introPages);
      if (services.length === 0) {
        const page = createPage();
        appendDivisionHeading(page, division);
        pages.push(await capturePage(page));
        continue;
      }

      for (let index = 0; index < services.length; index++) {
        pages.push(...await renderServicePages(division, services[index]!, index === 0));
      }
    }

    pages.push(...guide223Pages);
    downloadBlob(createRasterPdf(pages), "دليل الخدمات.pdf");
  } catch (error) {
    console.error("[PDF Export] Failed to generate PDF:", error);
    throw error;
  }
}
