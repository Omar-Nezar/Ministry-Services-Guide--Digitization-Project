import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import { prisma } from "@db";
import { UPLOAD_DIR } from "@/middlewares/upload.middleware.js";

// The pages the admin adds to the exported PDF. Reading is public (the export runs for everyone);
// changing is admin only (see admin.routes.ts).

const SLOTS = ["start", "end", "before", "after"];
const NO_PICTURE = "Send a png, jpg, gif or webp picture (up to 10 MB).";

const bad = (response: Response, error: string) => void response.status(400).json({ error });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bodyOf = (request: Request): Record<string, unknown> => (isRecord(request.body) ? request.body : {});

function removeUpload(imagePath: string): void {
  fs.rm(path.join(UPLOAD_DIR, path.basename(imagePath)), { force: true }, () => {});
}

const ordered = [{ order: "asc" as const }, { id: "asc" as const }];

export async function listPdfPages(_request: Request, response: Response): Promise<void> {
  response.json(await prisma.pdfPage.findMany({ orderBy: ordered }));
}

/** multipart fields: slot, serviceDivisionId (before | after), size, orientation, image */
export async function createPdfPage(request: Request, response: Response): Promise<void> {
  if (!request.file) return bad(response, NO_PICTURE);
  const body = bodyOf(request);
  const slot = String(body["slot"]);
  const size = body["size"] === "A3" ? "A3" : "A4";
  const orientation = body["orientation"] === "landscape" ? "landscape" : "portrait";
  const perCategory = slot === "before" || slot === "after";
  const divisionId = perCategory ? Number(body["serviceDivisionId"]) : null;

  const invalid =
    !SLOTS.includes(slot) ||
    (perCategory && (!Number.isInteger(divisionId) || !(await prisma.serviceDivision.findUnique({ where: { id: divisionId! } }))));
  if (invalid) {
    removeUpload(request.file.filename);
    return bad(response, "Choose where the page goes.");
  }

  const last =
    (await prisma.pdfPage.aggregate({ where: { slot, serviceDivisionId: divisionId }, _max: { order: true } }))._max.order ?? -1;
  const created = await prisma.pdfPage.create({
    data: { slot, serviceDivisionId: divisionId, size, orientation, imagePath: `uploads/${request.file.filename}`, order: last + 1 },
  });
  response.status(201).json(created);
}

export async function updatePdfPage(request: Request, response: Response): Promise<void> {
  const id = Number(request.params["id"]);
  const body = bodyOf(request);
  const data: { size?: string; orientation?: string; imageFit?: string; rotation?: number } = {};
  if ("size" in body) {
    if (body["size"] !== "A3" && body["size"] !== "A4") return bad(response, "Size must be A3 or A4.");
    data.size = body["size"];
  }
  if ("orientation" in body) {
    if (body["orientation"] !== "portrait" && body["orientation"] !== "landscape") return bad(response, "Orientation must be portrait or landscape.");
    data.orientation = body["orientation"];
  }
  if ("rotation" in body) {
    if (![0, 90, 180, 270].includes(body["rotation"] as number)) return bad(response, "Rotation must be 0, 90, 180 or 270.");
    data.rotation = body["rotation"] as number;
  }
  if ("imageFit" in body) {
    if (body["imageFit"] !== "contain" && body["imageFit"] !== "cover") return bad(response, "Fit must be contain or cover.");
    data.imageFit = body["imageFit"];
  }
  const updated = await prisma.pdfPage.update({ where: { id }, data }).catch(() => null);
  if (!updated) return void response.status(404).json({ error: "Page not found." });
  response.json(updated);
}

export async function deletePdfPage(request: Request, response: Response): Promise<void> {
  const page = await prisma.pdfPage.findUnique({ where: { id: Number(request.params["id"]) } });
  if (!page) return void response.status(404).json({ error: "Page not found." });
  await prisma.pdfPage.delete({ where: { id: page.id } });
  removeUpload(page.imagePath);
  response.json({ ok: true });
}

/** Body: the ids of one slot in their new order. */
export async function reorderPdfPages(request: Request, response: Response): Promise<void> {
  const ids = request.body;
  if (!Array.isArray(ids) || !ids.every((n) => Number.isInteger(n))) return bad(response, "Provide a list of ids.");
  await prisma.$transaction((ids as number[]).map((id, order) => prisma.pdfPage.updateMany({ where: { id }, data: { order } })));
  response.json({ ok: true });
}
