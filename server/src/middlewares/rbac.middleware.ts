import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";

/**
 * Middleware factory that grants access only to users who hold at least one
 * of the allowed roles (e.g. "admin", "staff").
 */
export function requireRole(...allowedRoles: string[]) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const hasRole = allowedRoles.some((role) =>
      authenticatedRequest.user!.roles.includes(role),
    );
    if (!hasRole) {
      response.status(403).json({ error: "Insufficient role permissions." });
      return;
    }

    next();
  };
}

/**
 * Middleware factory that grants access only to users who belong to at least
 * one of the allowed service divisions (e.g. "Lands", "IT").
 */
export function requireDivision(...allowedDivisions: string[]) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const hasDivision = allowedDivisions.some((division) =>
      authenticatedRequest.user!.serviceDivisions.includes(division),
    );
    if (!hasDivision) {
      response.status(403).json({
        error: "Insufficient division permissions.",
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory that combines role and division checks. Both must pass
 * when provided. Use this for fine-grained access such as "only admins in the
 * Lands division can manage lands records".
 */
export function requireAccess(options: {
  roles?: string[];
  divisions?: string[];
}) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const user = authenticatedRequest.user!;

    if (
      options.roles &&
      !options.roles.some((role) => user.roles.includes(role))
    ) {
      response.status(403).json({ error: "Insufficient role permissions." });
      return;
    }

    if (
      options.divisions &&
      !options.divisions.some((division) =>
        user.serviceDivisions.includes(division),
      )
    ) {
      response.status(403).json({
        error: "Insufficient division permissions.",
      });
      return;
    }

    next();
  };
}