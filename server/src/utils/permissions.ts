import type { AuthenticatedUser } from "@/middlewares/auth.middleware.js";

export const isAdmin = (user: AuthenticatedUser): boolean => user.roles.includes("admin");

/** Admins edit every category; staff only the category they signed in to. */
export const canEditDivision = (user: AuthenticatedUser, divisionName: string): boolean =>
  isAdmin(user) || user.serviceDivisions.includes(divisionName);
