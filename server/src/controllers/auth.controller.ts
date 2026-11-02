import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@db";
import { verifyPassword } from "@/utils/password.js";
import {
  createCsrfToken,
  hashSessionId,
  setSessionCookie,
  clearSessionCookie,
  SESSION_DURATION_SECONDS,
} from "@/utils/session.js";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

type LoginInput = {
  email: string;
  password: string;
};

function isLoginInput(body: unknown): body is LoginInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const input = body as Record<string, unknown>;
  return (
    typeof input.email === "string" &&
    input.email.trim().length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) &&
    typeof input.password === "string" &&
    input.password.length > 0 &&
    input.password.length <= 1024
  );
}

export async function loginUser(
  request: Request,
  response: Response,
): Promise<void> {
  if (!isLoginInput(request.body)) {
    response.status(400).json({ error: "Provide a valid email and password." });
    return;
  }

  const email = request.body.email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        serviceDivisions: {
          include: { serviceDivision: { select: { name: true } } },
        },
      },
    });

    if (!user || !(await verifyPassword(user.passwordHash, request.body.password))) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    if (!user.isActive) {
      response.status(403).json({ error: "This account is disabled. Contact an administrator." });
      return;
    }

    // The system, not the user, decides the role and the divisions: they come from the database
    const roles = user.roles.map(({ role }) => role.name);
    const departments = user.serviceDivisions.map(
      ({ serviceDivision }) => serviceDivision.name,
    );

    const now = new Date();
    const sessionId = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

    await prisma.session.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    await prisma.session.create({
      data: {
        id: hashSessionId(sessionId),
        userId: user.id,
        expiresAt,
      },
    });
    setSessionCookie(response, sessionId);

    response.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
      departments,
      csrfToken: createCsrfToken(sessionId),
    });
  } catch (error: unknown) {
    console.error("Failed to log in user.", error);
    response.status(500).json({ error: "Unable to log in right now." });
  }
}

export async function getCurrentUser(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  if (!request.user) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  if (!request.sessionId || !request.csrfToken) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        serviceDivisions: {
          include: { serviceDivision: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      response.status(404).json({ error: "User not found." });
      return;
    }

    const roles = user.roles.map(({ role }) => role.name);
    const departments = user.serviceDivisions.map(
      ({ serviceDivision }) => serviceDivision.name,
    );

    response.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
      departments,
      csrfToken: request.csrfToken,
    });
  } catch (error: unknown) {
    console.error("Failed to get current user.", error);
    response.status(500).json({ error: "Unable to get user right now." });
  }
}

export async function logoutUser(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  if (!request.sessionId) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    await prisma.session.deleteMany({
      where: { id: hashSessionId(request.sessionId) },
    });
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error: unknown) {
    console.error("Failed to log out user.", error);
    response.status(500).json({ error: "Unable to log out right now." });
  }
}

export async function deleteUser(
  request: Request,
  response: Response,
): Promise<void> {
  const email = String(request.params["email"] ?? "").trim().toLowerCase();

  if (!email) {
    response.status(400).json({ error: "Email parameter is required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        serviceDivisions: {
          include: { serviceDivision: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      response.status(404).json({ error: "User not found." });
      return;
    }

    // // Check if the authenticated user has admin role
    // const isAdmin = user.roles.some(({ role }) => role.name === "admin");

    // if (!isAdmin) {
    //   response.status(403).json({
    //     error: "Admin role required to delete users.",
    //   });
    //   return;
    // }

    // Delete the user
    await prisma.user.delete({
      where: { email },
    });

    response.status(200).json({
      message: "User deleted successfully.",
      deletedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to delete user.", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      response.status(400).json({
        error: "Cannot delete user because other records depend on it.",
      });
      return;
    }
    response.status(500).json({ error: "Failed to delete user." });
  }
}
