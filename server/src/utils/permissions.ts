import type { TokenPayload } from "@/utils/jwt.js";

export const isAdmin = (user: TokenPayload): boolean => user.roles.includes("admin");

/** Admins edit every category; staff only the category they signed in to. */
export const canEditDivision = (user: TokenPayload, divisionName: string): boolean =>
  isAdmin(user) || user.serviceDivisions.includes(divisionName);
