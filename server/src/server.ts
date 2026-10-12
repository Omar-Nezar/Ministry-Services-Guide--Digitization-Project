import "dotenv/config";
import cors from "cors";
import express from "express";
import authRouter from "./routes/auth.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.send("Server is running");
});

// Routes
app.use("/auth", authRouter);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
