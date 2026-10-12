import { Router } from "express";
import {
  loginUser,
  registerAdmin,
  registerUser,
} from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/register", registerUser);
// TODO: Remove this publicly accessible admin registration route before deployment.
authRouter.post("/register-admin", registerAdmin);

export default authRouter;