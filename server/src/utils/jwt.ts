import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET: string = (() => {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET environment variable is not defined.");
  }
  return value;
})();

const EXPIRES_IN_SECONDS: number = (() => {
  const value = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60);
  return Number.isFinite(value) && value > 0 ? value : 7 * 24 * 60 * 60;
})();

export type TokenPayload = {
  userId: number;
  email: string;
  roles: string[];
  serviceDivisions: string[];
};

function base64UrlEncode(input: Buffer | string): string {
  const data =
    typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return data
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }
  return Buffer.from(normalized, "base64");
}

export function signToken(payload: TokenPayload): string {
  const header = base64UrlEncode(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  );
  const now = Math.floor(Date.now() / 1000);
  const payloadWithClaims = {
    ...payload,
    iat: now,
    exp: now + EXPIRES_IN_SECONDS,
  };
  const encodedPayload = base64UrlEncode(
    JSON.stringify(payloadWithClaims),
  );
  const signature = createHmac("sha256", SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format.");
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const expectedSignature = createHmac("sha256", SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  const actualBuf = Buffer.from(signatureB64, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(
    base64UrlDecode(payloadB64).toString("utf8"),
  ) as TokenPayload & { iat: number; exp: number };

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired.");
  }

  return {
    userId: payload.userId,
    email: payload.email,
    roles: payload.roles ?? [],
    serviceDivisions: payload.serviceDivisions ?? [],
  };
}