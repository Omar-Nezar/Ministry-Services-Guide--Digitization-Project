import type { Request, Response, NextFunction } from "express";
import { prisma } from "@db";
import {
  clearSessionCookie,
  createCsrfToken,
  getSessionIdFromCookie,
  hashSessionId,
} from "@/utils/session.js";
import { timingSafeEqual } from "node:crypto";

export type AuthenticatedUser = {
  userId: number;
  email: string;
  roles: string[];
  serviceDivisions: string[];
};

export interface AuthenticatedRequest extends Request {
  /** Roles and divisions are loaded from the database for each request. */
  user?: AuthenticatedUser;
  userName?: string;
  mustChangePassword?: boolean;
  sessionId?: string;
  csrfToken?: string;
  sessionExpiresAt?: Date;
}

function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

/** Signed in, and allowed to go on even while a new password is still due (/auth/me, /refresh, /logout, /password). */
export const authenticatePendingSession = (request: Request, response: Response, next: NextFunction) =>
  authenticate(request, response, next, true);

/** Signed in, and past the first-login password step. */
export const authenticateSession = (request: Request, response: Response, next: NextFunction) =>
  authenticate(request, response, next, false);

async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
  allowPasswordPending: boolean,
): Promise<void> {
  const sessionId = getSessionIdFromCookie(request.headers.cookie);
  if (!sessionId) {
    clearSessionCookie(response);
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: hashSessionId(sessionId) },
      include: {
        user: {
          include: {
            roles: { include: { role: { select: { name: true } } } },
            serviceDivisions: {
              include: { serviceDivision: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) {
        await prisma.session.deleteMany({ where: { id: session.id } });
      }
      clearSessionCookie(response);
      response.status(401).json({ error: "Session is invalid or expired." });
      return;
    }

    if (session.user.mustChangePassword && !allowPasswordPending) {
      response.status(403).json({ error: "You must set a new password first.", code: "PASSWORD_CHANGE_REQUIRED" });
      return;
    }

    const authenticated = request as AuthenticatedRequest;
    authenticated.sessionId = sessionId;
    authenticated.csrfToken = createCsrfToken(sessionId);
    authenticated.sessionExpiresAt = session.expiresAt;
    authenticated.user = {
      userId: session.user.id,
      email: session.user.email,
      roles: session.user.roles.map(({ role }) => role.name),
      serviceDivisions: session.user.serviceDivisions.map(
        ({ serviceDivision }) => serviceDivision.name,
      ),
    };
    authenticated.userName = session.user.name;
    authenticated.mustChangePassword = session.user.mustChangePassword;

    if (!isSafeMethod(request.method)) {
      const suppliedToken = request.get("X-CSRF-Token") ?? "";
      const expected = Buffer.from(authenticated.csrfToken, "utf8");
      const supplied = Buffer.from(suppliedToken, "utf8");
      if (
        expected.length !== supplied.length ||
        !timingSafeEqual(expected, supplied)
      ) {
        response.status(403).json({ error: "Invalid CSRF token." });
        return;
      }
    }

    next();
  } catch (error) {
    console.error("Failed to authenticate the user.", error);
    response.status(500).json({ error: "Unable to verify your account right now." });
  }
}
