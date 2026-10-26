import "dotenv/config";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import authRouter from "./routes/auth.routes.js";
import editorRouter from "./routes/editor.routes.js";
import guideRouter from "./routes/guide.routes.js";
import { UPLOAD_DIR } from "./middlewares/upload.middleware.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
// A flowchart with pictures can be a few hundred KB
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (_request, response) => {
  response.send("Server is running");
});

// Routes
app.use("/auth", authRouter);
app.use("/guide", guideRouter);
app.use("/editor", editorRouter);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
