// Writes a service to a .docx: its name, then every label with the text under it. The labels hold html
// (Tiptap or Word), so it is read with the browser's parser. Text only: pictures and flowcharts are left out.
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, ShadingType, TextRun } from "docx";
import { DEFAULT_LABEL_COLOR, type GuideLabel } from "@/lib/guide-api";

const ARABIC = /[؀-ۿݐ-ݿ]/;
const FONT = { ascii: "Arial", hAnsi: "Arial", cs: "Arial" };
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
const BLOCK = /^(P|H[1-6]|UL|OL|LI|DIV|TABLE|THEAD|TBODY|TR|TD|TH|BLOCKQUOTE)$/;

type Style = { bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean; color?: string; size?: number; fill?: string };
type List = { ordered: boolean; level: number; instance: number };

const hex = (c: string | null | undefined) => {
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c ?? "");
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
  return /^#([0-9a-f]{6})$/i.exec(c ?? "")?.[1]?.toUpperCase();
};

function run(text: string, s: Style) {
  const rtl = ARABIC.test(text);
  return new TextRun({
    text,
    font: FONT,
    rightToLeft: rtl,
    bold: s.bold,
    boldComplexScript: s.bold,
    italics: s.italics,
    italicsComplexScript: s.italics,
    underline: s.underline ? {} : undefined,
    strike: s.strike,
    color: s.color,
    size: s.size,
    shading: s.fill ? { type: ShadingType.CLEAR, fill: s.fill } : undefined,
  });
}

function inline(node: Node, style: Style, out: TextRun[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ");
    if (text) out.push(run(text, style));
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  if (node.tagName === "BR") return void out.push(new TextRun({ break: 1 }));
  const px = parseFloat(node.style.fontSize);
  const next: Style = {
    ...style,
    ...(/^(STRONG|B)$/.test(node.tagName) && { bold: true }),
    ...(/^(EM|I)$/.test(node.tagName) && { italics: true }),
    ...(node.tagName === "U" && { underline: true }),
    ...(/^(S|DEL)$/.test(node.tagName) && { strike: true }),
    ...(node.tagName === "MARK" && { fill: hex(node.style.backgroundColor) ?? hex(node.dataset["color"]) ?? "FFFF00" }),
    ...(node.classList.contains("important") && { color: "C00000" }),
    ...(hex(node.style.color) && { color: hex(node.style.color) }),
    ...(px > 0 && { size: Math.round(px * 1.5) }), // px to half-points
  };
  node.childNodes.forEach((c) => inline(c, next, out));
}

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  center: AlignmentType.CENTER,
  justify: AlignmentType.BOTH,
  // the text is right-to-left, so the start of the line is the right side, as in the editor
  right: AlignmentType.START,
  left: AlignmentType.END,
};

function paragraph(nodes: Node[], el: HTMLElement | null, list?: List) {
  const runs: TextRun[] = [];
  nodes.forEach((n) => inline(n, {}, runs));
  const level = el && /^H[1-6]$/.test(el.tagName) ? Math.min(Number(el.tagName[1]) + 1, 5) : undefined;
  return new Paragraph({
    children: runs,
    bidirectional: true,
    heading: level === undefined ? undefined : HEADINGS[level],
    alignment: ALIGN[el?.style.textAlign ?? ""],
    ...(list && (list.ordered ? { numbering: { reference: "ordered", level: list.level, instance: list.instance } } : { bullet: { level: list.level } })),
  });
}

let instances = 0;

function blocks(parent: Node, out: Paragraph[], list?: List) {
  let loose: Node[] = [];
  const flush = () => {
    if (loose.some((n) => (n.textContent ?? "").trim() || (n as Element).tagName === "BR")) out.push(paragraph(loose, null, list));
    loose = [];
  };
  for (const node of parent.childNodes) {
    if (!(node instanceof HTMLElement) || !BLOCK.test(node.tagName)) {
      loose.push(node);
      continue;
    }
    flush();
    if (node.tagName === "UL" || node.tagName === "OL") {
      const ordered = node.tagName === "OL";
      const next = { ordered, level: list ? list.level + 1 : 0, instance: ordered ? ++instances : 0 };
      blocks(node, out, next);
    } else if (/^(P|H[1-6])$/.test(node.tagName)) {
      out.push(paragraph([...node.childNodes], node, list));
    } else {
      blocks(node, out, list);
    }
  }
  flush();
}

export type DocxItem = { name: string; labels: GuideLabel[] };

function serviceParagraphs(name: string, labels: GuideLabel[], pageBreak: boolean, out: Paragraph[]) {
  out.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      bidirectional: true,
      pageBreakBefore: pageBreak,
      spacing: { after: 240 },
      children: [run(name, { bold: true, size: 40 })],
    }),
  );
  for (const label of labels) {
    const body = new DOMParser().parseFromString(label.html, "text/html").body;
    if (!body.textContent?.trim()) continue;
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        bidirectional: true,
        spacing: { before: 240, after: 80 },
        shading: { type: ShadingType.CLEAR, fill: hex(label.color) ?? hex(DEFAULT_LABEL_COLOR) ?? "666666" },
        children: [run(label.name, { bold: true, color: "FFFFFF", size: 26 })],
      }),
    );
    blocks(body, out);
  }
}

/** One document holding every given service, each starting on a new page. */
export function toDocxMany(items: DocxItem[]) {
  const out: Paragraph[] = [];
  items.forEach((item, i) => serviceParagraphs(item.name, item.labels, i > 0, out));
  const levels = Array.from({ length: 6 }, (_, level) => ({ level, format: "decimal" as const, text: `%${level + 1}.`, alignment: AlignmentType.START }));
  return new Document({ numbering: { config: [{ reference: "ordered", levels }] }, sections: [{ children: out }] });
}

export const toDocx = (name: string, labels: GuideLabel[]) => toDocxMany([{ name, labels }]);

export const docxBlob = (items: DocxItem[]) => Packer.toBlob(toDocxMany(items));

/** A name that is safe as a file or folder name. */
export const safeFileName = (name: string, fallback = "service") =>
  // long names break Windows' path limit when the zip is extracted, so they are cut
  name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 60).trim() || fallback;

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDocx(name: string, labels: GuideLabel[]) {
  saveBlob(await docxBlob([{ name, labels }]), `${safeFileName(name)}.docx`);
}

export type ExportGroup = { name: string; services: { id: number; name: string }[] };

/**
 * Exports the chosen services. One service is a single .docx. With more, "single" puts each category's services in
 * one file and "separate" gives every service its own file. Anything that ends up as several files (more than one
 * category, or separate files) is zipped, with a folder per category when the services span several.
 */
export async function exportServices(groups: ExportGroup[], mode: "single" | "separate", load: (id: number) => Promise<DocxItem>) {
  const total = groups.reduce((n, g) => n + g.services.length, 0);
  if (total === 0) return;
  const loaded = new Map<number, DocxItem>();
  for (const g of groups) for (const s of g.services) loaded.set(s.id, await load(s.id));
  const item = (s: { id: number; name: string }): DocxItem => ({ ...loaded.get(s.id)!, name: s.name });

  if (total === 1) {
    const s = groups[0].services[0];
    return saveBlob(await docxBlob([item(s)]), `${safeFileName(s.name)}.docx`);
  }
  if (mode === "single" && groups.length === 1) {
    return saveBlob(await docxBlob(groups[0].services.map(item)), `${safeFileName(groups[0].name, "services")}.docx`);
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Set<string>();
  const unique = (path: string) => {
    let candidate = `${path}.docx`;
    for (let i = 2; used.has(candidate); i++) candidate = `${path} (${i}).docx`;
    used.add(candidate);
    return candidate;
  };
  for (const g of groups) {
    const folder = groups.length > 1 ? `${safeFileName(g.name, "category")}/` : "";
    if (mode === "single") {
      zip.file(unique(`${folder}${safeFileName(g.name, "services")}`), await docxBlob(g.services.map(item)));
    } else {
      for (const s of g.services) zip.file(unique(`${folder}${safeFileName(s.name)}`), await docxBlob([item(s)]));
    }
  }
  saveBlob(await zip.generateAsync({ type: "blob" }), "services.zip");
}
