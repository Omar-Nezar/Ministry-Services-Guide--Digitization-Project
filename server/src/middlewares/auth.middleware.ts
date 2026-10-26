import type { Request, Response, NextFunction } from "express";
import { prisma } from "@db";
import { verifyToken, type TokenPayload } from "@/utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  /** Roles and divisions are read from the database on every request, not trusted from the token */
  user?: TokenPayload;
  userName?: string;
}

export async function authenticateToken(request: Request, response: Response, next: NextFunction): Promise<void> {
  const authHeader = request.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    response.status(401).json({ error: "Access token required." });
    return;
  }

  let userId: number;
  try {
    userId = verifyToken(authHeader.slice("Bearer ".length)).userId;
  } catch {
    response.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        serviceDivisions: { include: { serviceDivision: { select: { name: true } } } },
      },
    });

    // A removed or disabled account stops working at once, even with a valid token
    if (!user || !user.isActive) {
      response.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    const authenticated = request as AuthenticatedRequest;
    authenticated.user = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map(({ role }) => role.name),
      serviceDivisions: user.serviceDivisions.map(({ serviceDivision }) => serviceDivision.name),
    };
    authenticated.userName = user.name;
    next();
  } catch (error) {
    console.error("Failed to authenticate the user.", error);
    response.status(500).json({ error: "Unable to verify your account right now." });
  }
}
