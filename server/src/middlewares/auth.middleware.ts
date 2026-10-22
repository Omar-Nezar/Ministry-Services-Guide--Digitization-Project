import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "@/utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateToken(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authHeader = request.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    response.status(401).json({ error: "Access token required." });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    (request as AuthenticatedRequest).user = verifyToken(token);
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired token." });
  }
}