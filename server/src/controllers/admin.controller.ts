import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@db";
import { hashPassword } from "@/utils/password.js";
import { HIDDEN_DIVISIONS, serviceUnits } from "@/utils/guide.js";
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
  const [services, latest] = await Promise.all([
    prisma.service.findMany({ select: { name: true } }),
    prisma.serviceAudit.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);

  response.json({
    totalServices: services.reduce((total, service) => total + serviceUnits(service.name), 0),
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

const MAX_LOG_ROWS = 500;

/** The change log: newest first. ?limit=5|10|all (default 5) and ?division=<category name> to filter. */
export async function listUpdates(request: Request, response: Response): Promise<void> {
  const { limit, division } = request.query;
  const take = limit === "all" ? MAX_LOG_ROWS : Math.min(Math.max(Number(limit) || 5, 1), MAX_LOG_ROWS);
  const rows = await prisma.serviceAudit.findMany({
    where: typeof division === "string" && division ? { divisionName: division } : {},
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  response.json(
    rows.map((r) => ({
      id: Number(r.id),
      action: r.action,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      divisionName: r.divisionName,
      userName: r.userName,
      detail: r.detail,
      createdAt: r.createdAt,
    })),
  );
}

// ---------------------------------------------------------------------------
// Staff accounts (users with the "staff" role): added here with a temporary password,
// which the person replaces the first time they sign in.
// ---------------------------------------------------------------------------

const staffSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  serviceDivisions: { select: { serviceDivision: { select: { id: true, name: true, nameAr: true } } } },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof staffSelect }>;

const staffJson = ({ serviceDivisions, ...user }: StaffRow) => ({
  ...user,
  divisions: serviceDivisions.map((d) => d.serviceDivision),
});

// IT accounts are created in the database only: the admin neither sees nor manages them
const staffOnly: Prisma.UserWhereInput = {
  roles: { some: { role: { name: "staff" } } },
  NOT: { serviceDivisions: { some: { serviceDivision: { name: { in: HIDDEN_DIVISIONS } } } } },
};

export async function listStaff(_request: Request, response: Response): Promise<void> {
  const staff = await prisma.user.findMany({ where: staffOnly, select: staffSelect, orderBy: { name: "asc" } });
  response.json(staff.map(staffJson));
}

const idParam = (request: Request): number => Number(request.params["id"]);

/** The ids of existing categories: at least one, no repeats. Null when the list is not valid. */
async function divisionIdsOf(value: unknown): Promise<number[] | null> {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = [...new Set(value.map(Number))];
  if (!ids.every((id) => Number.isInteger(id) && id > 0)) return null;
  const found = await prisma.serviceDivision.count({ where: { id: { in: ids }, name: { notIn: HIDDEN_DIVISIONS } } });
  return found === ids.length ? ids : null;
}

const NO_CATEGORY = "Select at least one existing category.";

/** { name, email, divisionIds }: answers with the new account and its temporary password (shown once). */
export async function createStaff(request: Request, response: Response): Promise<void> {
  const body = bodyOf(request);
  const name = text(body["name"], 200);
  if (!name) return bad(response, "Provide a name.");
  const email = text(body["email"], 320)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(response, "Provide a valid email.");
  const divisionIds = await divisionIdsOf(body["divisionIds"]);
  if (!divisionIds) return bad(response, NO_CATEGORY);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return void response.status(409).json({ error: "An account with this email already exists." });
  }
  const role = await prisma.role.findUnique({ where: { name: "staff" } });
  if (!role) return void response.status(500).json({ error: 'The "staff" role does not exist.' });

  const temporaryPassword = randomBytes(9).toString("base64url");
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      roles: { create: { roleId: role.id } },
      serviceDivisions: { create: divisionIds.map((serviceDivisionId) => ({ serviceDivisionId })) },
    },
    select: staffSelect,
  });
  response.status(201).json({ ...staffJson(user), temporaryPassword });
}

/** { name?, divisionIds?, isActive? } */
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
    if (!Number.isInteger(divisionId) || !(await prisma.serviceDivision.findFirst({ where: { id: divisionId, name: { notIn: HIDDEN_DIVISIONS } } }))) {
      return bad(response, "The selected category does not exist.");
    }
    // A staff member has one category: replace the old one
    data.serviceDivisions = { deleteMany: {}, create: { serviceDivisionId: divisionId } };
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({
      where: { id },
      data,
      select: staffSelect,
    });
    if (body["isActive"] === false) {
      await transaction.session.deleteMany({ where: { userId: id } });
    }
    return user;
  });
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
