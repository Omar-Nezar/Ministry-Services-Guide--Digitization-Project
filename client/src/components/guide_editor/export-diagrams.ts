// Writes the procedure flowcharts of the chosen services to .xlsx. Each category becomes one workbook with a sheet
// per diagram; when the selection spans more than one category, every category's workbook goes into a .zip.
import { parseDoc } from "@/components/flowchart/diagram";
import { buildWorkbook, type DiagramSheet } from "@/components/flowchart/export-xlsx";
import type { CopyDoc } from "@/components/flowchart/types";
import { diagramColor, flowchartTitle, type EditorService } from "@/lib/guide-api";
import { safeFileName, saveBlob, type ExportGroup } from "./export-docx";

/** A diagram with no shapes, lines or text has nothing to show, so it gets no sheet. */
const isEmpty = (d: CopyDoc) => d.shapes.length === 0 && d.lines.length === 0 && !d.cells.some((c) => c.text?.trim());

/**
 * Exports the diagrams of the chosen services. Returns false when none of them has a diagram.
 * One category: one .xlsx (one sheet per diagram). One diagram alone: a .xlsx named after it. More categories: a .zip.
 */
export async function exportDiagrams(groups: ExportGroup[], load: (id: number) => Promise<EditorService>): Promise<boolean> {
  const loaded = new Map<number, EditorService>();
  for (const g of groups) for (const s of g.services) loaded.set(s.id, await load(s.id));

  const books: { name: string; sheets: DiagramSheet[] }[] = [];
  for (const g of groups) {
    const sheets: DiagramSheet[] = [];
    for (const s of g.services) {
      const service = loaded.get(s.id)!;
      const color = diagramColor(service);
      for (const f of service.flowcharts) {
        const doc = parseDoc(f.json, f.title ?? "");
        if (isEmpty(doc)) continue;
        sheets.push({ name: flowchartTitle(f, s.name), doc, color });
      }
    }
    if (sheets.length) books.push({ name: g.name, sheets });
  }
  if (books.length === 0) return false;

  if (books.length === 1) {
    const { name, sheets } = books[0];
    const fileName = sheets.length === 1 ? sheets[0].name : name;
    saveBlob(await buildWorkbook(sheets), `${safeFileName(fileName, "diagrams")}.xlsx`);
    return true;
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Set<string>();
  for (const b of books) {
    const base = safeFileName(b.name, "category");
    let file = `${base}.xlsx`;
    for (let i = 2; used.has(file); i++) file = `${base} (${i}).xlsx`;
    used.add(file);
    zip.file(file, await buildWorkbook(b.sheets));
  }
  saveBlob(await zip.generateAsync({ type: "blob" }), "diagrams.zip");
  return true;
}
