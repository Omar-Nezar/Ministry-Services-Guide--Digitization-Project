import type { Request, Response } from "express";
import { prisma } from "@db";
import { byOrder, excerpt, serviceLabels } from "@/utils/guide.js";

// What the public guide shows. Nothing here changes data.
const serviceOrder = [{ order: "asc" as const }, { sourceFile: "asc" as const }, { id: "asc" as const }];

const idParam = (request: Request): number => Number(request.params["id"]);

/** Categories with their services' names: the cards and the sidebar. */
export async function getTree(_request: Request, response: Response): Promise<void> {
  const divisions = await prisma.serviceDivision.findMany({
    where: { services: { some: {} } },
    orderBy: byOrder,
    select: {
      id: true,
      name: true,
      nameAr: true,
      color: true,
      services: { orderBy: serviceOrder, select: { id: true, name: true } },
    },
  });
  response.json(divisions);
}

/** One category with its services as cards. */
export async function getDivision(request: Request, response: Response): Promise<void> {
  const division = await prisma.serviceDivision.findUnique({
    where: { id: idParam(request) },
    select: {
      id: true,
      name: true,
      nameAr: true,
      color: true,
      services: {
        orderBy: serviceOrder,
        select: {
          id: true,
          name: true,
          sections: { where: { key: { in: ["description", "duration"] } }, select: { key: true, html: true } },
        },
      },
    },
  });
  if (!division) {
    response.status(404).json({ error: "Category not found." });
    return;
  }
  response.json({
    ...division,
    services: division.services.map(({ sections, ...s }) => ({
      ...s,
      description: excerpt(sections.find((x) => x.key === "description")?.html),
      duration: excerpt(sections.find((x) => x.key === "duration")?.html, 60),
    })),
  });
}

/** One service: its label rows, flowchart list (drawings load separately) and pictures. */
export async function getService(request: Request, response: Response): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: idParam(request) },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      serviceDivision: { select: { id: true, name: true, nameAr: true, color: true } },
      flowcharts: { orderBy: byOrder, select: { id: true, title: true } },
      images: { orderBy: byOrder, select: { id: true, imagePath: true, imageFit: true, caption: true } },
    },
  });
  if (!service) {
    response.status(404).json({ error: "Service not found." });
    return;
  }
  const { id, color } = service.serviceDivision;
  response.json({ ...service, labels: await serviceLabels(service.id, id, color) });
}

/** One flowchart's drawing. Separate from the service because a drawing with pictures can be a few hundred KB. */
export async function getFlowchart(request: Request, response: Response): Promise<void> {
  const flowchart = await prisma.flowchart.findUnique({ where: { id: idParam(request) }, select: { json: true } });
  if (!flowchart) {
    response.status(404).json({ error: "Flowchart not found." });
    return;
  }
  response.type("json").send(flowchart.json);
}
