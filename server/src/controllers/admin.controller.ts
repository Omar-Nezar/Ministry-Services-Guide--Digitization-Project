import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "@db";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

// The admin API (see admin.routes.ts): the dashboard and the staff accounts. Admins only.

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bodyOf = (request: Request): Record<string, unknown> => (isRecord(request.body) ? request.body : {});
const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;
const bad = (response: Response, error: string) => void response.status(400).json({ error });
const notFound = (response: Response) => void response.status(404).json({ error: "Staff member not found." });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(_request: Request, response: Response): Promise<void> {
  const [totalServices, latest] = await Promise.all([
    prisma.service.count(),
    prisma.serviceAudit.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);

  response.json({
    totalServices,
    latestUpdate: latest && {
      action: latest.action,
      serviceId: latest.serviceId,
      serviceName: latest.serviceName,
      divisionName: latest.divisionName,
      userName: latest.userName,
      detail: latest.detail,
      createdAt: latest.createdAt,
    },
  });
}

// ---------------------------------------------------------------------------
// Staff accounts (users with the "staff" role). Accounts are added in the database, not here.
// ---------------------------------------------------------------------------

const staffSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  serviceDivisions: { select: { serviceDivision: { select: { id: true, name: true, nameAr: true } } } },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof staffSelect }>;

const staffJson = ({ serviceDivisions, ...user }: StaffRow) => ({
  ...user,
  divisions: serviceDivisions.map((d) => d.serviceDivision),
});

const staffOnly: Prisma.UserWhereInput = { roles: { some: { role: { name: "staff" } } } };

export async function listStaff(_request: Request, response: Response): Promise<void> {
  const staff = await prisma.user.findMany({ where: staffOnly, select: staffSelect, orderBy: { name: "asc" } });
  response.json(staff.map(staffJson));
}

const idParam = (request: Request): number => Number(request.params["id"]);

/** { name?, divisionId?, isActive? } */
export async function updateStaff(request: Request, response: Response): Promise<void> {
  const id = idParam(request);
  const member = await prisma.user.findFirst({ where: { id, ...staffOnly }, select: { id: true } });
  if (!member) return notFound(response);

  const body = bodyOf(request);
  const data: Prisma.UserUpdateInput = {};
  if ("name" in body) {
    const name = text(body["name"], 200);
    if (!name) return bad(response, "Provide a name.");
    data.name = name;
  }
  if ("isActive" in body) {
    if (typeof body["isActive"] !== "boolean") return bad(response, "isActive must be true or false.");
    data.isActive = body["isActive"];
  }
  if ("divisionId" in body) {
    const divisionId = Number(body["divisionId"]);
    if (!Number.isInteger(divisionId) || !(await prisma.serviceDivision.findUnique({ where: { id: divisionId } }))) {
      return bad(response, "The selected category does not exist.");
    }
    // A staff member has one category: replace the old one
    data.serviceDivisions = { deleteMany: {}, create: { serviceDivisionId: divisionId } };
  }

  const updated = await prisma.user.update({ where: { id }, data, select: staffSelect });
  response.json(staffJson(updated));
}

export async function deleteStaff(request: Request, response: Response): Promise<void> {
  const id = idParam(request);
  if (id === (request as AuthenticatedRequest).user?.userId) return bad(response, "You cannot remove yourself.");
  const member = await prisma.user.findFirst({ where: { id, ...staffOnly }, select: { id: true } });
  if (!member) return notFound(response);

  // Their audit rows stay (the user link becomes empty, the copied name remains)
  await prisma.user.delete({ where: { id } });
  response.json({ ok: true });
}
