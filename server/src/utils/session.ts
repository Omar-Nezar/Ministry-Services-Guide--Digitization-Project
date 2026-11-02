import { createHash, createHmac } from "node:crypto";
import type { Response } from "express";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-ministry-session"
    : "ministry-session";
const COOKIE_SECURE = process.env.NODE_ENV === "production";

export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function createCsrfToken(sessionId: string): string {
  return createHmac("sha256", sessionId)
    .update("ministry-session-csrf")
    .digest("base64url");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite:
      process.env.SESSION_COOKIE_SAME_SITE === "none"
        ? ("none" as const)
        : ("lax" as const),
    path: "/",
  };
}

export function setSessionCookie(response: Response, sessionId: string): void {
  response.cookie(SESSION_COOKIE_NAME, sessionId, {
    ...cookieOptions(),
    maxAge: SESSION_DURATION_SECONDS * 1000,
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}

export function getSessionIdFromCookie(
  cookieHeader: string | undefined,
): string | null {
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  const sessionId = cookie?.slice(prefix.length);
  return sessionId && /^[A-Za-z0-9_-]{43}$/.test(sessionId) ? sessionId : null;
}
