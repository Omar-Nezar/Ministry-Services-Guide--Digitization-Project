export type RasterPdfPage = {
  image: Uint8Array;
  width: number;
  height: number;
  showPageNumber?: boolean;
};

const PAGE_WIDTH = 420 * 72 / 25.4;
const PAGE_HEIGHT = 297 * 72 / 25.4;
const PAGE_SCALE = 2;

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not encode an image."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not encode an image."));
    reader.readAsDataURL(blob);
  });
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

async function inlineImage(url: string): Promise<string> {
  if (/^(data:|blob:|#)/i.test(url)) return url;
  const absoluteUrl = new URL(url, document.baseURI).href;
  const response = await fetch(absoluteUrl);
  if (!response.ok) throw new Error(`Could not load an image for PDF export: ${absoluteUrl} (${response.status})`);
  return dataUrl(await response.blob());
}

async function prepareImages(element: HTMLElement): Promise<Map<string, HTMLImageElement>> {
  const images = new Map<string, HTMLImageElement>();
  const cache = new Map<string, Promise<string>>();
  const asDataUrl = (url: string) => {
    let data = cache.get(url);
    if (!data) {
      data = inlineImage(url);
      cache.set(url, data);
    }
    return data;
  };

  for (const image of Array.from(element.querySelectorAll("img"))) {
    image.src = await asDataUrl(image.currentSrc || image.src);
    await image.decode();
  }
  for (const image of Array.from(element.querySelectorAll("svg image"))) {
    const source = image.getAttribute("href") ?? image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!source) continue;
    const embedded = await asDataUrl(source);
    image.setAttribute("href", embedded);
    image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", embedded);
    if (!embedded.startsWith("#")) {
      const loaded = new Image();
      loaded.src = embedded;
      await loaded.decode();
      images.set(source, loaded);
      images.set(embedded, loaded);
    }
  }
  return images;
}

type TextLine = { text: string; left: number; right: number; top: number; bottom: number };

function drawTextNode(
  node: Text,
  context: CanvasRenderingContext2D,
  origin: DOMRect,
): void {
  const parent = node.parentElement;
  const value = node.textContent ?? "";
  if (!parent || !value) return;

  const style = getComputedStyle(parent);
  if (style.display === "none" || style.visibility === "hidden" || style.color === "rgba(0, 0, 0, 0)") return;
  const lines: TextLine[] = [];
  const range = document.createRange();
  let offset = 0;

  for (const character of Array.from(value)) {
    range.setStart(node, offset);
    range.setEnd(node, offset + character.length);
    offset += character.length;

    const rect = range.getBoundingClientRect();
    if (rect.height === 0) {
      if (/^\s+$/.test(character) && lines.length) lines[lines.length - 1]!.text += character;
      continue;
    }

    const top = rect.top - origin.top;
    let line = lines.find((candidate) => Math.abs(candidate.top - top) < 1.5);
    if (!line) {
      line = {
        text: "",
        left: rect.left - origin.left,
        right: rect.right - origin.left,
        top,
        bottom: rect.bottom - origin.top,
      };
      lines.push(line);
    }
    line.text += character;
    line.left = Math.min(line.left, rect.left - origin.left);
    line.right = Math.max(line.right, rect.right - origin.left);
    line.top = Math.min(line.top, top);
    line.bottom = Math.max(line.bottom, rect.bottom - origin.top);
  }

  const fontSize = Number.parseFloat(style.fontSize) || 14;
  context.save();
  context.fillStyle = style.color;
  context.direction = style.direction === "rtl" ? "rtl" : "ltr";
  context.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  context.textBaseline = "alphabetic";
  const align = style.textAlign;
  const anchor = align === "center"
    ? "center"
    : align === "right" || align === "end" || (align === "start" && style.direction === "rtl")
      ? "right"
      : "left";
  context.textAlign = anchor;

  for (const line of lines) {
    let text = line.text;
    if (style.textTransform === "uppercase") text = text.toUpperCase();
    if (style.textTransform === "lowercase") text = text.toLowerCase();
    const metrics = context.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const baseline = line.top + Math.max(0, (line.bottom - line.top - ascent - descent) / 2) + ascent;
    const x = anchor === "center" ? (line.left + line.right) / 2 : anchor === "right" ? line.right : line.left;
    context.fillText(text, x, baseline, Math.max(line.right - line.left, 1) * 1.2);

    if (style.textDecorationLine.includes("underline") || style.textDecorationLine.includes("line-through")) {
      context.strokeStyle = style.textDecorationColor === "currentcolor" ? style.color : style.textDecorationColor;
      context.lineWidth = Math.max(1, fontSize / 16);
      context.beginPath();
      if (style.textDecorationLine.includes("underline")) {
        context.moveTo(line.left, baseline + descent);
        context.lineTo(line.right, baseline + descent);
      }
      if (style.textDecorationLine.includes("line-through")) {
        context.moveTo(line.left, baseline - ascent / 3);
        context.lineTo(line.right, baseline - ascent / 3);
      }
      context.stroke();
    }
  }
  context.restore();
  context.restore();
}

function drawBox(element: HTMLElement, context: CanvasRenderingContext2D, origin: DOMRect): DOMRect {
  const rect = element.getBoundingClientRect();
  const x = rect.left - origin.left;
  const y = rect.top - origin.top;
  const style = getComputedStyle(element);
  context.save();
  context.save();
  if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
    context.fillStyle = style.backgroundColor;
    context.beginPath();
    context.roundRect(x, y, rect.width, rect.height, Number.parseFloat(style.borderTopLeftRadius) || 0);
    context.fill();
  }

  const borders: [number, number, number, number, string, string][] = [
    [rect.left, rect.top, rect.right, rect.top, style.borderTopColor, style.borderTopWidth],
    [rect.right, rect.top, rect.right, rect.bottom, style.borderRightColor, style.borderRightWidth],
    [rect.right, rect.bottom, rect.left, rect.bottom, style.borderBottomColor, style.borderBottomWidth],
    [rect.left, rect.bottom, rect.left, rect.top, style.borderLeftColor, style.borderLeftWidth],
  ];
  context.lineCap = "butt";
  for (const [x1, y1, x2, y2, color, width] of borders) {
    const lineWidth = Number.parseFloat(width);
    if (!lineWidth || color === "rgba(0, 0, 0, 0)") continue;
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(x1 - origin.left, y1 - origin.top);
    context.lineTo(x2 - origin.left, y2 - origin.top);
    context.stroke();
  }
  context.restore();
  return rect;
}

function drawHtmlElement(
  element: HTMLElement,
  context: CanvasRenderingContext2D,
  origin: DOMRect,
  scale: number,
  images: Map<string, HTMLImageElement>,
): void {
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return;

  context.save();
  const opacity = Number.parseFloat(style.opacity);
  if (Number.isFinite(opacity)) context.globalAlpha *= opacity;
  const rect = drawBox(element, context, origin);
  const x = rect.left - origin.left;
  const y = rect.top - origin.top;
  const tagName = element.tagName;

  if (tagName === "IMG") {
    const image = element as HTMLImageElement;
    if (!image.complete || image.naturalWidth === 0) return;
    const fit = style.objectFit;
    context.save();
    context.beginPath();
    context.rect(x, y, rect.width, rect.height);
    context.clip();
    if (fit === "cover") {
      const factor = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const width = image.naturalWidth * factor;
      const height = image.naturalHeight * factor;
      context.drawImage(image, x + (rect.width - width) / 2, y + (rect.height - height) / 2, width, height);
    } else {
      const factor = fit === "fill" ? Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
        : Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const width = image.naturalWidth * factor;
      const height = image.naturalHeight * factor;
      context.drawImage(image, x + (rect.width - width) / 2, y + (rect.height - height) / 2, width, height);
    }
    context.restore();
    context.restore();
    return;
  }

  if (tagName === "UL" || tagName === "OL") {
    const listItems = Array.from(element.children).filter((child) => child.tagName === "LI");
    listItems.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const rtl = getComputedStyle(item).direction === "rtl";
      const markerX = rtl ? itemRect.right - origin.left - 4 : itemRect.left - origin.left + 4;
      const markerY = itemRect.top - origin.top + itemRect.height / 2;
      context.save();
      context.fillStyle = getComputedStyle(item).color;
      context.font = `${style.fontSize} ${style.fontFamily}`;
      context.textAlign = rtl ? "right" : "left";
      context.textBaseline = "middle";
      context.fillText(tagName === "OL" ? `${Number(element.getAttribute("start") ?? 1) + index}.` : "•", markerX, markerY);
      context.restore();
    });
  }

  if (element.namespaceURI === "http://www.w3.org/2000/svg") {
    drawSvgElement(element as unknown as SVGElement, context, origin, scale, images);
    context.restore();
    return;
  }

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) drawTextNode(child as Text, context, origin);
    else if (child instanceof HTMLElement) drawHtmlElement(child, context, origin, scale, images);
    else if (child instanceof SVGElement) drawSvgElement(child, context, origin, scale, images);
  }
  context.restore();
}

function drawSvgElement(
  element: SVGElement,
  context: CanvasRenderingContext2D,
  origin: DOMRect,
  scale: number,
  images: Map<string, HTMLImageElement>,
): void {
  const name = element.localName;
  if (name === "defs" || name === "title" || name === "desc") return;
  if (name === "foreignObject") {
    const style = getComputedStyle(element);
    context.save();
    const opacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(opacity)) context.globalAlpha *= opacity;
    for (const child of Array.from(element.children)) {
      if (child instanceof HTMLElement) drawHtmlElement(child, context, origin, scale, images);
    }
    context.restore();
    return;
  }
  if (name === "svg" || name === "g") {
    const style = getComputedStyle(element);
    context.save();
    const opacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(opacity)) context.globalAlpha *= opacity;
    for (const child of Array.from(element.children)) {
      if (child instanceof SVGElement) drawSvgElement(child, context, origin, scale, images);
    }
    context.restore();
    return;
  }

  const matrix = (element as SVGGraphicsElement).getScreenCTM();
  if (!matrix) return;
  context.save();
  context.setTransform(
    scale * matrix.a,
    scale * matrix.b,
    scale * matrix.c,
    scale * matrix.d,
    scale * (matrix.e - origin.left),
    scale * (matrix.f - origin.top),
  );
  const style = getComputedStyle(element);
  const opacity = Number.parseFloat(style.opacity);
  if (Number.isFinite(opacity)) context.globalAlpha *= opacity;
  context.fillStyle = style.fill;
  context.strokeStyle = style.stroke;
  context.lineWidth = Number.parseFloat(style.strokeWidth) || 1;
  context.lineJoin = style.strokeLinejoin as CanvasLineJoin;
  context.lineCap = style.strokeLinecap as CanvasLineCap;
  context.setLineDash(style.strokeDasharray === "none"
    ? []
    : style.strokeDasharray.split(/[ ,]+/).map((part) => Number.parseFloat(part)).filter(Number.isFinite));

  if (name === "path") {
    const path = new Path2D(element.getAttribute("d") ?? "");
    if (style.fill !== "none" && style.fill !== "transparent") context.fill(path);
    if (style.stroke !== "none" && style.stroke !== "transparent") context.stroke(path);
  } else if (name === "rect") {
    const x = Number(element.getAttribute("x") ?? 0);
    const y = Number(element.getAttribute("y") ?? 0);
    const width = Number(element.getAttribute("width") ?? 0);
    const height = Number(element.getAttribute("height") ?? 0);
    const radius = Number(element.getAttribute("rx") ?? 0);
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    if (style.fill !== "none" && style.fill !== "transparent") context.fill();
    if (style.stroke !== "none" && style.stroke !== "transparent") context.stroke();
  } else if (name === "circle" || name === "ellipse") {
    const cx = Number(element.getAttribute("cx") ?? 0);
    const cy = Number(element.getAttribute("cy") ?? 0);
    const rx = name === "circle" ? Number(element.getAttribute("r") ?? 0) : Number(element.getAttribute("rx") ?? 0);
    const ry = name === "circle" ? rx : Number(element.getAttribute("ry") ?? 0);
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (style.fill !== "none" && style.fill !== "transparent") context.fill();
    if (style.stroke !== "none" && style.stroke !== "transparent") context.stroke();
  } else if (name === "line") {
    context.beginPath();
    context.moveTo(Number(element.getAttribute("x1") ?? 0), Number(element.getAttribute("y1") ?? 0));
    context.lineTo(Number(element.getAttribute("x2") ?? 0), Number(element.getAttribute("y2") ?? 0));
    context.stroke();
  } else if (name === "image") {
    const href = (element as SVGImageElement).href.baseVal;
    const image = images.get(href) ?? images.get(element.getAttribute("href") ?? "");
    if (image) {
      context.drawImage(
        image,
        Number(element.getAttribute("x") ?? 0),
        Number(element.getAttribute("y") ?? 0),
        Number(element.getAttribute("width") ?? image.naturalWidth),
        Number(element.getAttribute("height") ?? image.naturalHeight),
      );
    }
  } else if (name === "polygon" || name === "polyline") {
    const points = (element.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number);
    if (points.length >= 4) {
      context.beginPath();
      context.moveTo(points[0]!, points[1]!);
      for (let index = 2; index + 1 < points.length; index += 2) context.lineTo(points[index]!, points[index + 1]!);
      if (name === "polygon") context.closePath();
      if (name === "polygon" && style.fill !== "none" && style.fill !== "transparent") context.fill();
      if (style.stroke !== "none" && style.stroke !== "transparent") context.stroke();
    }
  }
  context.restore();
}

export async function rasterizeElement(element: HTMLElement): Promise<RasterPdfPage> {
  await document.fonts?.ready;

  const bounds = element.getBoundingClientRect();
  const cssWidth = Math.ceil(bounds.width);
  const cssHeight = Math.ceil(bounds.height);
  if (cssWidth <= 0 || cssHeight <= 0) {
    throw new Error("Cannot export an element with no rendered size.");
  }

  const images = await prepareImages(element);
  const canvas = document.createElement("canvas");
  canvas.width = cssWidth * PAGE_SCALE;
  canvas.height = cssHeight * PAGE_SCALE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a canvas context for PDF export.");
  context.scale(PAGE_SCALE, PAGE_SCALE);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, cssWidth, cssHeight);
  context.save();
  context.beginPath();
  context.rect(0, 0, cssWidth, cssHeight);
  context.clip();
  drawHtmlElement(element, context, bounds, PAGE_SCALE, images);
  context.restore();

  return {
    image: await canvasToJpeg(canvas),
    width: canvas.width,
    height: canvas.height,
  };
}

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function joinBytes(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function createRasterPdf(pages: RasterPdfPage[]): Blob {
  if (pages.length === 0) throw new Error("Cannot create a PDF without pages.");

  const objects: Uint8Array[] = [];
  const pageRefs = pages.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  objects.push(bytes("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(bytes(`<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs}] >>`));

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageName = `Im${index}`;

    const pageContent = [
      `q ${PAGE_WIDTH.toFixed(3)} 0 0 ${PAGE_HEIGHT.toFixed(3)} 0 0 cm /${imageName} Do Q`,
      ...(page.showPageNumber
        ? [`BT /F1 8 Tf ${(PAGE_WIDTH / 2 - 3).toFixed(3)} 12 Td (${index + 1}) Tj ET`]
        : []),
    ].join("\n");

    objects.push(bytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(3)} ${PAGE_HEIGHT.toFixed(3)}] ` +
      `/Resources << /XObject << /${imageName} ${imageId} 0 R >> ` +
      `${page.showPageNumber ? "/Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> " : ""}>> ` +
      `/Contents ${contentId} 0 R >>`,
    ));
    objects.push(joinBytes([
      bytes(
        `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.image.length} >>\nstream\n`,
      ),
      page.image,
      bytes("\nendstream"),
    ]));
    objects.push(bytes(`<< /Length ${bytes(pageContent).length} >>\nstream\n${pageContent}\nendstream`));
  });

  const output: Uint8Array[] = [bytes("%PDF-1.4\n")];
  const offsets = [0];
  let currentOffset = output[0]!.length;

  objects.forEach((object, index) => {
    offsets.push(currentOffset);
    const wrapper = joinBytes([bytes(`${index + 1} 0 obj\n`), object, bytes("\nendobj\n")]);
    output.push(wrapper);
    currentOffset += wrapper.length;
  });

  const xrefOffset = currentOffset;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ].join("");
  output.push(bytes(xref));

  const contents = joinBytes(output);
  const buffer = new ArrayBuffer(contents.length);
  new Uint8Array(buffer).set(contents);
  return new Blob([buffer], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
