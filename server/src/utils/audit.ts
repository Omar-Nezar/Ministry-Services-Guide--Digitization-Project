import type { Request } from "express";
import { prisma } from "@db";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

export type AuditAction =
  | "service.create"
  | "service.rename"
  | "service.delete"
  | "service.move"
  | "section.save"
  | "flowchart.create"
  | "flowchart.update"
  | "flowchart.delete"
  | "image.create"
  | "image.replace"
  | "image.update"
  | "image.delete";

type AuditService = { id: number; name: string; divisionName?: string | null };

/**
 * Records one change to a service. Logging never fails the edit itself: a problem is printed and ignored.
 * Pass the service as it was before a delete (the row keeps the copied names).
 */
export async function logServiceChange(
  request: Request,
  action: AuditAction,
  service: AuditService,
  detail?: string | null,
  options: { serviceDeleted?: boolean } = {},
): Promise<void> {
  const { user, userName } = request as AuthenticatedRequest;
  try {
    await prisma.serviceAudit.create({
      data: {
        action,
        serviceId: options.serviceDeleted ? null : service.id,
        serviceName: service.name.slice(0, 400),
        divisionName: service.divisionName ?? null,
        userId: user?.userId ?? null,
        userName: (userName ?? user?.email ?? "").slice(0, 200),
        detail: detail ? detail.slice(0, 500) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write the audit log.", error);
  }
}
