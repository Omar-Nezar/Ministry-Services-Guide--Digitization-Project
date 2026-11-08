import "dotenv/config";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import adminRouter from "./routes/admin.routes.js";
import authRouter from "./routes/auth.routes.js";
import editorRouter from "./routes/editor.routes.js";
import feedbackRouter from "./routes/feedback.routes.js";
import guideRouter from "./routes/guide.routes.js";
import { UPLOAD_DIR } from "./middlewares/upload.middleware.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = (process.env.CLIENT_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = isProduction
  ? []
  : ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = [...new Set([...configuredOrigins, ...developmentOrigins])];

if (allowedOrigins.length === 0) {
  throw new Error("CLIENT_ORIGINS must contain at least one trusted frontend origin.");
}

if (
  allowedOrigins.some((origin) => {
    try {
      const parsed = new URL(origin);
      return (
        parsed.origin !== origin ||
        (isProduction && parsed.protocol !== "https:")
      );
    } catch {
      return true;
    }
  })
) {
  throw new Error(
    "CLIENT_ORIGINS must contain exact origins; production origins must use HTTPS.",
  );
}

const sameSite = process.env.SESSION_COOKIE_SAME_SITE ?? "lax";
if (sameSite !== "lax" && sameSite !== "none") {
  throw new Error('SESSION_COOKIE_SAME_SITE must be either "lax" or "none".');
}
if (sameSite === "none" && !isProduction) {
  throw new Error('SESSION_COOKIE_SAME_SITE="none" requires NODE_ENV=production and HTTPS.');
}

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      callback(null, origin !== undefined && allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
// A flowchart with pictures can be a few hundred KB
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (_request, response) => {
  response.send("Server is running");
});

// Routes
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/guide", guideRouter);
app.use("/editor", editorRouter);
app.use("/feedback", feedbackRouter);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
