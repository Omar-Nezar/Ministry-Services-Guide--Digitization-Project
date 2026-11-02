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
  sessionId?: string;
  csrfToken?: string;
}

function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export async function authenticateSession(request: Request, response: Response, next: NextFunction): Promise<void> {
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

    const authenticated = request as AuthenticatedRequest;
    authenticated.sessionId = sessionId;
    authenticated.csrfToken = createCsrfToken(sessionId);
    authenticated.user = {
      userId: session.user.id,
      email: session.user.email,
      roles: session.user.roles.map(({ role }) => role.name),
      serviceDivisions: session.user.serviceDivisions.map(
        ({ serviceDivision }) => serviceDivision.name,
      ),
    };
    authenticated.userName = session.user.name;

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
