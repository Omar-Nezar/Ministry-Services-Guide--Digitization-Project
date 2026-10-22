import dotenv from "dotenv";
dotenv.config();

const BASE = "http://localhost:3001";

/* ========================================================================= *
 *                           USER CONFIGURATION
 * ========================================================================= */
const USER_CONFIG = {
  // Change these values to test different users / roles / divisions
  name: "Test User",
  email: "testuser@example.com",
  password: "SecurePass123",

  // If you want to test role+department selection on login, set these:
  // (Leave as null to test "defaults to user's first role/division")
  role: "staff",           // valid options: "admin", "staff"  (must match user's actual role)
  department: "Lands",     // valid options: any from /auth/options serviceDivisions
};

const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || "admin@mail.com",
  password: process.env.ADMIN_PASSWORD || "Admin123"
};

/* ========================================================================= *
 *                           INTERNAL HELPERS
 * ========================================================================= */
async function request(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function indent(n) { return "  ".repeat(n); }

async function decodeJwt(token) {
  if (!token) return null;
  const base64url = token.split(".")[1];
  if (!base64url) return null;
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return JSON.parse(raw);
}
/* ========================================================================= *
 *                              MAIN TEST FLOW
 * ========================================================================= */
(async () => {
  console.log("\n=== 🔐 test-login.mjs starting ===\n");
  console.log("Admin", ADMIN_CONFIG);

  // ---- 0. Login as admin to get token ----
  console.log("--- Step 0: POST /auth/login as admin ---");
  const adminLogin = await request("POST", "/auth/login", {
    email: ADMIN_CONFIG.email,
    password: ADMIN_CONFIG.password,
  });
  console.log(`${indent(1)}Status: ${adminLogin.status}`);
  if (adminLogin.status !== 200) {
    console.error("❌ Admin login failed. Aborting (cannot delete without admin token).");
    return;
  }
  const adminToken = adminLogin.body.token;
  console.log(`${indent(1)}✅ Admin logged in, obtained JWT token`);

  // ---- 1. Fetch available options (roles + divisions) ----
  console.log("--- Step 1: GET /auth/options ---");
  const opts = await request("GET", "/auth/options");
  console.log(`${indent(1)}Status: ${opts.status}`);
  console.log(`${indent(1)}Roles:        ${JSON.stringify(opts.body.roles)}`);
  console.log(`${indent(1)}Divisions:    ${JSON.stringify(opts.body.serviceDivisions)}`);
  if (opts.status !== 200) {
    console.error("❌ Failed to fetch options. Aborting.");
    return;
  }

  // ---- 2. Register the user ----
  console.log("\n--- Step 2: POST /auth/register ---");
  const reg = await request("POST", "/auth/register", {
    name: USER_CONFIG.name,
    email: USER_CONFIG.email,
    password: USER_CONFIG.password,
    department: USER_CONFIG.department,
  });
  console.log(`${indent(1)}Status: ${reg.status}`);
  if (reg.status === 201 || reg.status === 409) {
    console.log(`${indent(1)}Response: ${JSON.stringify(reg.body)}`);
  } else {
    console.warn("⚠ Unexpected register response, continuing anyway...");
  }

  // ---- 3. Login WITHOUT role/department (defaults) ----
  console.log("\n--- Step 3: POST /auth/login (no role/dept) ---");
  const login1 = await request("POST", "/auth/login", {
    email: USER_CONFIG.email,
    password: USER_CONFIG.password,
  });
  console.log(`${indent(1)}Status: ${login1.status}`);
  if (login1.status === 200) {
    const payload1 = await decodeJwt(login1.body.token);
    console.log(`${indent(1)}JWT payload roles:      ${JSON.stringify(payload1?.roles)}`);
    console.log(`${indent(1)}JWT payload departments: ${JSON.stringify(payload1?.serviceDivisions)}`);
    console.log(`${indent(1)}User ID:                 ${payload1?.userId}`);
    console.log(`${indent(1)}User email:              ${payload1?.email}`);
  } else {
    console.error("❌ Login failed:");
    console.log(`${indent(1)}  ${JSON.stringify(login1.body)}`);
  }

  // ---- 4. Login WITH role & department (if configured) ----
  if (USER_CONFIG.role !== null && USER_CONFIG.department !== null) {
    console.log("\n--- Step 4: POST /auth/login (with role/dept) ---");
    const login2 = await request("POST", "/auth/login", {
      email: USER_CONFIG.email,
      password: USER_CONFIG.password,
      role: USER_CONFIG.role,
      department: USER_CONFIG.department,
    });
    console.log(`${indent(1)}Status: ${login2.status}`);
    if (login2.status === 200) {
      const payload2 = await decodeJwt(login2.body.token);
      console.log(`${indent(1)}JWT payload roles:      ${JSON.stringify(payload2?.roles)}`);
      console.log(`${indent(1)}JWT payload departments: ${JSON.stringify(payload2?.serviceDivisions)}`);
      // Validation check
      const roleOk = payload2?.roles?.includes(USER_CONFIG.role);
      const deptOk = payload2?.serviceDivisions?.includes(USER_CONFIG.department);
      console.log(`${indent(1)}✅ Role matches: ${roleOk}`);
      console.log(`${indent(1)}✅ Department matches: ${deptOk}`);
      if (!roleOk || !deptOk) {
        console.warn("⚠ JWT contains unexpected roles/departments — check backend validation.");
      }
    } else {
      console.error("❌ Login with role/dept failed:");
      console.log(`${indent(1)}  ${JSON.stringify(login2.body)}`);
    }
  } else {
    console.log("\n--- Step 4: Skipped (role/dept not configured in USER_CONFIG) ---");
  }

  // ---- 5. Validation: invalid role ----
  console.log("\n--- Step 5: POST /auth/login (invalid role=admin) ---");
  const login3 = await request("POST", "/auth/login", {
    email: USER_CONFIG.email,
    password: USER_CONFIG.password,
    role: "admin",
    department: USER_CONFIG.department,
  });
  console.log(`${indent(1)}Status: ${login3.status}`);
  console.log(`${indent(1)}Error: ${JSON.stringify(login3.body)}`);

  // ---- 6. Validation: invalid department ----
  console.log("\n--- Step 6: POST /auth/login (invalid department) ---");
  const login4 = await request("POST", "/auth/login", {
    email: USER_CONFIG.email,
    password: USER_CONFIG.password,
    role: USER_CONFIG.role || "staff",
    department: "Nonexistent Division",
  });
  console.log(`${indent(1)}Status: ${login4.status}`);
  console.log(`${indent(1)}Error: ${JSON.stringify(login4.body)}`);

  console.log("\n=== ✅ test-login.mjs complete ===\n");

  // ---- 7. Delete the test user (cleanup) ----
  console.log("--- Step 7: DELETE test user (as admin) ---");
  const del = await request("DELETE", "/auth/users/" + USER_CONFIG.email, undefined, adminToken);
  console.log(`${indent(1)}Status: ${del.status}`);
  if (del.status === 200 || del.status === 204) {
    console.log(`${indent(1)}✅ Test user deleted successfully`);
  } else if (del.status === 404) {
    console.log(`${indent(1)}ℹ User already deleted or not found (OK if DB was reset)`);
  } else {
    console.warn(`${indent(1)}⚠ Could not delete user (status ${del.status}): ${JSON.stringify(del.body)}`);
  }

  console.log("👉  Delete this file when you're done:  rm server/test-login.mjs");
})();