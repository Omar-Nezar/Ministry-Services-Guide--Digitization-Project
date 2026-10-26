import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "@db";
import type { TokenPayload } from "@/utils/jwt.js";
import { byOrder, serviceLabels } from "@/utils/guide.js";
import { canEditDivision, isAdmin } from "@/utils/permissions.js";
import { logServiceChange } from "@/utils/audit.js";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";
import { UPLOAD_DIR } from "@/middlewares/upload.middleware.js";

// The services editor API. Every route needs a signed-in admin or staff member (see editor.routes.ts);
// staff can only change the category they signed in to, admins everything.

const serviceOrder = [{ order: "asc" as const }, { sourceFile: "asc" as const }, { id: "asc" as const }];
const HEX = /^#[0-9a-fA-F]{6}$/;

const userOf = (request: Request): TokenPayload => (request as AuthenticatedRequest).user!;
const idParam = (request: Request, name = "id"): number => Number(request.params[name]);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bodyOf = (request: Request): Record<string, unknown> => (isRecord(request.body) ? request.body : {});
const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;

const forbidden = (response: Response) => void response.status(403).json({ error: "You cannot edit this category." });
const notFound = (response: Response, what: string) => void response.status(404).json({ error: `${what} not found.` });
const bad = (response: Response, error: string) => void response.status(400).json({ error });
const duplicate = (response: Response) =>
  void response.status(409).json({ error: "This category already has a service with that name." });

const isDuplicate = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/** The ids in a reorder body, or null if the body is not a list of integers. */
function idList(body: unknown): number[] | null {
  return Array.isArray(body) && body.every((n) => Number.isInteger(n)) ? (body as number[]) : null;
}

/** A service (loaded with its category) as the audit log wants it. */
const auditOf = (service: { id: number; name: string; serviceDivision: { name: string } }) => ({
  id: service.id,
  name: service.name,
  divisionName: service.serviceDivision.name,
});

function removeUpload(imagePath: string | null | undefined): void {
  if (!imagePath) return;
  fs.rm(path.join(UPLOAD_DIR, path.basename(imagePath)), { force: true }, () => {});
}

// ---------------------------------------------------------------------------
// Categories and services (the sidebar)
// ---------------------------------------------------------------------------

export async function getTree(request: Request, response: Response): Promise<void> {
  const user = userOf(request);
  const divisions = await prisma.serviceDivision.findMany({
    orderBy: byOrder,
    select: {
      id: true,
      name: true,
      nameAr: true,
      color: true,
      services: { orderBy: serviceOrder, select: { id: true, name: true } },
    },
  });
  // Staff see only the categories they may edit; admins see all
  response.json(
    divisions
      .map((d) => ({ ...d, editable: canEditDivision(user, d.name) }))
      .filter((d) => d.editable),
  );
}

export async function updateDivision(request: Request, response: Response): Promise<void> {
  const user = userOf(request);
  const division = await prisma.serviceDivision.findUnique({ where: { id: idParam(request) } });
  if (!division) return notFound(response, "Category");
  if (!canEditDivision(user, division.name)) return forbidden(response);

  const body = bodyOf(request);
  const data: Prisma.ServiceDivisionUpdateInput = {};
  if ("color" in body) {
    const color = body["color"];
    if (color !== null && !(typeof color === "string" && HEX.test(color))) return bad(response, "Colour must be like #074169.");
    data.color = color;
  }
  if ("nameAr" in body) {
    if (!isAdmin(user)) return forbidden(response);
    const nameAr = text(body["nameAr"], 150);
    if (!nameAr) return bad(response, "Provide a name.");
    data.nameAr = nameAr;
  }
  response.json(await prisma.serviceDivision.update({ where: { id: division.id }, data }));
}

/** Categories' order (admin only): [ids] */
export async function reorderDivisions(request: Request, response: Response): Promise<void> {
  const ids = idList(request.body);
  if (!ids) return bad(response, "Provide a list of ids.");
  await prisma.$transaction(ids.map((id, order) => prisma.serviceDivision.update({ where: { id }, data: { order } })));
  response.json({ ok: true });
}

export async function createService(request: Request, response: Response): Promise<void> {
  const division = await prisma.serviceDivision.findUnique({ where: { id: idParam(request, "divisionId") } });
  if (!division) return notFound(response, "Category");
  if (!canEditDivision(userOf(request), division.name)) return forbidden(response);
  const name = text(bodyOf(request)["name"], 400);
  if (!name) return bad(response, "Provide a name.");

  try {
    const last = (await prisma.service.aggregate({ where: { serviceDivisionId: division.id }, _max: { order: true } }))._max.order ?? -1;
    const created = await prisma.service.create({
      data: { name, serviceDivisionId: division.id, order: last + 1 },
      select: { id: true, name: true },
    });
    await logServiceChange(request, "service.create", { ...created, divisionName: division.name });
    response.status(201).json(created);
  } catch (error) {
    if (isDuplicate(error)) return duplicate(response);
    throw error;
  }
}

/** Where services sit after a drag: [{ id, serviceDivisionId, order }] */
export async function arrangeServices(request: Request, response: Response): Promise<void> {
  const user = userOf(request);
  const items: unknown[] | null = Array.isArray(request.body) ? request.body : null;
  if (!items) return bad(response, "Provide a list.");
  const moves = items.filter(isRecord).map((i) => ({
    id: Number(i["id"]),
    serviceDivisionId: Number(i["serviceDivisionId"]),
    order: Number(i["order"]),
  }));
  if (moves.length !== items.length || moves.some((m) => !Number.isInteger(m.id) || !Number.isInteger(m.serviceDivisionId) || !Number.isInteger(m.order))) {
    return bad(response, "Invalid list.");
  }

  const [services, divisions] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: moves.map((m) => m.id) } }, select: { id: true, name: true, serviceDivision: { select: { name: true } } } }),
    prisma.serviceDivision.findMany({ select: { id: true, name: true } }),
  ]);
  const divisionName = new Map(divisions.map((d) => [d.id, d.name]));
  for (const m of moves) {
    const from = services.find((s) => s.id === m.id)?.serviceDivision.name;
    const to = divisionName.get(m.serviceDivisionId);
    if (!from || !to) return bad(response, "Unknown service or category.");
    if (!canEditDivision(user, from) || !canEditDivision(user, to)) return forbidden(response);
  }
  try {
    await prisma.$transaction(
      moves.map((m) => prisma.service.update({ where: { id: m.id }, data: { serviceDivisionId: m.serviceDivisionId, order: m.order } })),
    );
  } catch (error) {
    if (isDuplicate(error)) return duplicate(response);
    throw error;
  }
  // Only a move to another category is logged, not the reordering inside one
  for (const m of moves) {
    const service = services.find((s) => s.id === m.id)!;
    const to = divisionName.get(m.serviceDivisionId)!;
    if (service.serviceDivision.name !== to) {
      await logServiceChange(request, "service.move", { id: service.id, name: service.name, divisionName: to }, `${service.serviceDivision.name} → ${to}`);
    }
  }
  response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// One service
// ---------------------------------------------------------------------------

/** Loads a service and checks the user may edit its category. Sends the error and returns undefined otherwise. */
async function ownService(request: Request, response: Response) {
  const service = await prisma.service.findUnique({ where: { id: idParam(request) }, include: { serviceDivision: true } });
  if (!service) return void notFound(response, "Service");
  if (!canEditDivision(userOf(request), service.serviceDivision.name)) return void forbidden(response);
  return service;
}

export async function getService(request: Request, response: Response): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: idParam(request) },
    include: {
      serviceDivision: { select: { id: true, name: true, nameAr: true, color: true } },
      flowcharts: { orderBy: byOrder, select: { id: true, title: true, json: true } },
      images: { orderBy: byOrder },
    },
  });
  if (!service) return notFound(response, "Service");
  const { id, name, color } = service.serviceDivision;
  // Staff cannot open services of other categories
  if (!canEditDivision(userOf(request), name)) return forbidden(response);
  response.json({
    id: service.id,
    name: service.name,
    serviceDivision: service.serviceDivision,
    editable: canEditDivision(userOf(request), name),
    labels: await serviceLabels(service.id, id, color),
    flowcharts: service.flowcharts,
    images: service.images,
  });
}

export async function renameService(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  const name = text(bodyOf(request)["name"], 400);
  if (!name) return bad(response, "Provide a name.");
  try {
    const renamed = await prisma.service.update({ where: { id: service.id }, data: { name }, select: { id: true, name: true } });
    await logServiceChange(request, "service.rename", { ...renamed, divisionName: service.serviceDivision.name }, `${service.name} → ${name}`);
    response.json(renamed);
  } catch (error) {
    if (isDuplicate(error)) return duplicate(response);
    throw error;
  }
}

export async function deleteService(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  const images = await prisma.serviceImage.findMany({ where: { serviceId: service.id }, select: { imagePath: true } });
  await prisma.service.delete({ where: { id: service.id } });
  await logServiceChange(request, "service.delete", { id: service.id, name: service.name, divisionName: service.serviceDivision.name }, null, { serviceDeleted: true });
  images.forEach((i) => removeUpload(i.imagePath));
  response.json({ ok: true });
}

/** Saves the html of one label's text (created on first save). */
export async function saveSection(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  const key = String(request.params["key"]);
  const html = bodyOf(request)["html"];
  if (typeof html !== "string") return bad(response, "Provide html.");

  const [label, section] = await Promise.all([
    prisma.sectionLabel.findUnique({ where: { key } }),
    prisma.serviceSection.findUnique({ where: { serviceId_key: { serviceId: service.id, key } } }),
  ]);
  if (!label && !section) return notFound(response, "Label");

  await prisma.serviceSection.upsert({
    where: { serviceId_key: { serviceId: service.id, key } },
    update: { html },
    create: { serviceId: service.id, key, label: label?.name ?? null, html, order: label?.order ?? 0 },
  });
  await prisma.service.update({ where: { id: service.id }, data: { updatedAt: new Date() } });
  await logServiceChange(request, "section.save", auditOf(service), label?.name ?? section?.label ?? key);
  response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Flowcharts
// ---------------------------------------------------------------------------

export async function createFlowchart(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  const body = bodyOf(request);
  if (typeof body["json"] !== "string") return bad(response, "Provide the drawing as json text.");
  const last = (await prisma.flowchart.aggregate({ where: { serviceId: service.id }, _max: { order: true } }))._max.order ?? -1;
  const created = await prisma.flowchart.create({
    data: { serviceId: service.id, title: text(body["title"], 400), json: body["json"], order: last + 1 },
    select: { id: true, title: true, json: true },
  });
  await logServiceChange(request, "flowchart.create", auditOf(service), created.title);
  response.status(201).json(created);
}

async function ownFlowchart(request: Request, response: Response) {
  const flowchart = await prisma.flowchart.findUnique({
    where: { id: idParam(request) },
    include: { service: { include: { serviceDivision: true } } },
  });
  if (!flowchart) return void notFound(response, "Flowchart");
  if (!canEditDivision(userOf(request), flowchart.service.serviceDivision.name)) return void forbidden(response);
  return flowchart;
}

export async function updateFlowchart(request: Request, response: Response): Promise<void> {
  const flowchart = await ownFlowchart(request, response);
  if (!flowchart) return;
  const body = bodyOf(request);
  const data: Prisma.FlowchartUpdateInput = {};
  if ("json" in body) {
    if (typeof body["json"] !== "string") return bad(response, "Provide the drawing as json text.");
    data.json = body["json"];
  }
  if ("title" in body) data.title = typeof body["title"] === "string" ? body["title"].trim().slice(0, 400) || null : null;
  await prisma.flowchart.update({ where: { id: flowchart.id }, data });
  await logServiceChange(request, "flowchart.update", auditOf(flowchart.service), "title" in data ? String(data.title ?? "") : flowchart.title);
  response.json({ ok: true });
}

export async function deleteFlowchart(request: Request, response: Response): Promise<void> {
  const flowchart = await ownFlowchart(request, response);
  if (!flowchart) return;
  await prisma.flowchart.delete({ where: { id: flowchart.id } });
  await logServiceChange(request, "flowchart.delete", auditOf(flowchart.service), flowchart.title);
  response.json({ ok: true });
}

export async function reorderFlowcharts(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  const ids = idList(request.body);
  if (!ids) return bad(response, "Provide a list of ids.");
  await prisma.$transaction(ids.map((id, order) => prisma.flowchart.updateMany({ where: { id, serviceId: service.id }, data: { order } })));
  response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

const NO_PICTURE = "Send a png, jpg, gif or webp picture (up to 10 MB).";

export async function createImage(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  if (!request.file) return bad(response, NO_PICTURE);
  const last = (await prisma.serviceImage.aggregate({ where: { serviceId: service.id }, _max: { order: true } }))._max.order ?? -1;
  const created = await prisma.serviceImage.create({
    data: { serviceId: service.id, imagePath: `uploads/${request.file.filename}`, order: last + 1 },
  });
  await logServiceChange(request, "image.create", auditOf(service));
  response.status(201).json(created);
}

async function ownImage(request: Request, response: Response) {
  const image = await prisma.serviceImage.findUnique({
    where: { id: idParam(request) },
    include: { service: { include: { serviceDivision: true } } },
  });
  if (!image) return void notFound(response, "Picture");
  if (!canEditDivision(userOf(request), image.service.serviceDivision.name)) return void forbidden(response);
  return image;
}

export async function replaceImage(request: Request, response: Response): Promise<void> {
  const image = await ownImage(request, response);
  if (!image) return;
  if (!request.file) return bad(response, NO_PICTURE);
  const updated = await prisma.serviceImage.update({ where: { id: image.id }, data: { imagePath: `uploads/${request.file.filename}` } });
  removeUpload(image.imagePath);
  await logServiceChange(request, "image.replace", auditOf(image.service));
  response.json(updated);
}

export async function updateImage(request: Request, response: Response): Promise<void> {
  const image = await ownImage(request, response);
  if (!image) return;
  const body = bodyOf(request);
  const data: Prisma.ServiceImageUpdateInput = {};
  if ("imageFit" in body) {
    const fit = body["imageFit"];
    if (fit !== "contain" && fit !== "cover") return bad(response, "Fit must be contain or cover.");
    data.imageFit = fit;
  }
  if ("caption" in body) data.caption = typeof body["caption"] === "string" ? body["caption"].trim().slice(0, 400) || null : null;
  const updated = await prisma.serviceImage.update({ where: { id: image.id }, data });
  await logServiceChange(request, "image.update", auditOf(image.service));
  response.json(updated);
}

export async function deleteImage(request: Request, response: Response): Promise<void> {
  const image = await ownImage(request, response);
  if (!image) return;
  await prisma.serviceImage.delete({ where: { id: image.id } });
  removeUpload(image.imagePath);
  await logServiceChange(request, "image.delete", auditOf(image.service));
  response.json({ ok: true });
}

export async function reorderImages(request: Request, response: Response): Promise<void> {
  const service = await ownService(request, response);
  if (!service) return;
  const ids = idList(request.body);
  if (!ids) return bad(response, "Provide a list of ids.");
  await prisma.$transaction(ids.map((id, order) => prisma.serviceImage.updateMany({ where: { id, serviceId: service.id }, data: { order } })));
  response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Label library and category colours
// ---------------------------------------------------------------------------

export async function getLabels(_request: Request, response: Response): Promise<void> {
  response.json(await prisma.sectionLabel.findMany({ orderBy: byOrder }));
}

export async function createLabel(request: Request, response: Response): Promise<void> {
  const name = text(bodyOf(request)["name"], 200);
  if (!name) return bad(response, "Provide a name.");
  const last = (await prisma.sectionLabel.aggregate({ _max: { order: true } }))._max.order ?? -1;
  const created = await prisma.sectionLabel.create({ data: { key: `label-${Date.now().toString(36)}`, name, order: last + 1 } });
  response.status(201).json(created);
}

export async function updateLabel(request: Request, response: Response): Promise<void> {
  const name = text(bodyOf(request)["name"], 200);
  if (!name) return bad(response, "Provide a name.");
  const label = await prisma.sectionLabel.findUnique({ where: { id: idParam(request) } });
  if (!label) return notFound(response, "Label");
  response.json(await prisma.sectionLabel.update({ where: { id: label.id }, data: { name } }));
}

/** Removes the label and the text every service wrote under it. */
export async function deleteLabel(request: Request, response: Response): Promise<void> {
  const label = await prisma.sectionLabel.findUnique({ where: { id: idParam(request) } });
  if (!label) return notFound(response, "Label");
  await prisma.$transaction([
    prisma.serviceSection.deleteMany({ where: { key: label.key } }),
    prisma.sectionLabel.delete({ where: { id: label.id } }),
  ]);
  response.json({ ok: true });
}

export async function reorderLabels(request: Request, response: Response): Promise<void> {
  const ids = idList(request.body);
  if (!ids) return bad(response, "Provide a list of ids.");
  await prisma.$transaction(ids.map((id, order) => prisma.sectionLabel.update({ where: { id }, data: { order } })));
  response.json({ ok: true });
}

export async function getLabelColors(_request: Request, response: Response): Promise<void> {
  response.json(await prisma.divisionLabelColor.findMany());
}

/** { serviceDivisionId, labelId, color } - a null colour removes the override. */
export async function setLabelColor(request: Request, response: Response): Promise<void> {
  const body = bodyOf(request);
  const serviceDivisionId = Number(body["serviceDivisionId"]);
  const labelId = Number(body["labelId"]);
  const color = body["color"];
  if (!Number.isInteger(serviceDivisionId) || !Number.isInteger(labelId)) return bad(response, "Provide a category and a label.");
  if (color !== null && !(typeof color === "string" && HEX.test(color))) return bad(response, "Colour must be like #074169.");

  const division = await prisma.serviceDivision.findUnique({ where: { id: serviceDivisionId } });
  if (!division) return notFound(response, "Category");
  if (!canEditDivision(userOf(request), division.name)) return forbidden(response);

  if (color === null) await prisma.divisionLabelColor.deleteMany({ where: { serviceDivisionId, labelId } });
  else {
    await prisma.divisionLabelColor.upsert({
      where: { serviceDivisionId_labelId: { serviceDivisionId, labelId } },
      update: { color },
      create: { serviceDivisionId, labelId, color },
    });
  }
  response.json({ ok: true });
}

export async function clearLabelColors(request: Request, response: Response): Promise<void> {
  const division = await prisma.serviceDivision.findUnique({ where: { id: idParam(request, "divisionId") } });
  if (!division) return notFound(response, "Category");
  if (!canEditDivision(userOf(request), division.name)) return forbidden(response);
  await prisma.divisionLabelColor.deleteMany({ where: { serviceDivisionId: division.id } });
  response.json({ ok: true });
}
