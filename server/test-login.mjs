import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const BASE = (process.env.API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const email = process.env.SMOKE_TEST_EMAIL;
const password = process.env.SMOKE_TEST_PASSWORD;

if (!email || !password) {
  throw new Error("Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD to run the session smoke test.");
}

async function request(method, path, options = {}) {
  const headers = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.csrfToken) headers["X-CSRF-Token"] = options.csrfToken;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const body =
    response.status === 204
      ? null
      : await response.json().catch(() => null);
  return { response, body };
}

function expectStatus(result, expected, step) {
  if (result.response.status !== expected) {
    throw new Error(
      `${step}: expected HTTP ${expected}, received ${result.response.status}.`,
    );
  }
}

const anonymous = await request("GET", "/auth/me");
expectStatus(anonymous, 401, "Anonymous session check");

const login = await request("POST", "/auth/login", {
  body: { email, password },
});
expectStatus(login, 200, "Login");

const sessionCookie = login.response.headers.get("set-cookie")?.split(";", 1)[0];
const csrfToken = login.body?.csrfToken;
if (!sessionCookie || typeof csrfToken !== "string" || !csrfToken) {
  throw new Error("Login did not return a session cookie and CSRF token.");
}
if ("token" in login.body) {
  throw new Error("Login unexpectedly returned a client-held token.");
}

const currentUser = await request("GET", "/auth/me", { cookie: sessionCookie });
expectStatus(currentUser, 200, "Restore session");
if (currentUser.body?.email !== email) {
  throw new Error("Restored session did not identify the authenticated account.");
}

const csrfRejected = await request("POST", "/auth/logout", {
  cookie: sessionCookie,
});
expectStatus(csrfRejected, 403, "Logout without CSRF token");

const logout = await request("POST", "/auth/logout", {
  cookie: sessionCookie,
  csrfToken,
});
expectStatus(logout, 204, "Logout with CSRF token");

const afterLogout = await request("GET", "/auth/me", { cookie: sessionCookie });
expectStatus(afterLogout, 401, "Session after logout");

console.log("Session smoke test passed: login, restore, CSRF enforcement, and revocation.");
