import { Router } from "express";
import {
  deleteUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
} from "../controllers/auth.controller.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import {
  requireAccess,
  requireDivision,
  requireRole,
} from "../middlewares/rbac.middleware.js";

const authRouter = Router();

authRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

authRouter.post("/login", loginUser);
authRouter.get("/me", authenticateSession, getCurrentUser);
authRouter.post("/refresh", authenticateSession, refreshSession);
authRouter.post("/logout", authenticateSession, logoutUser);

authRouter.get(
  "/admin/dashboard",
  authenticateSession,
  requireRole("admin"),
  (_request, response) => {
    response.status(200).json({
      message: "Admin dashboard",
      access: "full",
    });
  },
);

authRouter.delete(
  "/users/:email",
  authenticateSession,
  requireRole("admin"),
  deleteUser,
);

authRouter.get(
  "/staff/dashboard",
  authenticateSession,
  requireRole("staff", "admin"),
  (_request, response) => {
    response.status(200).json({
      message: "Staff dashboard",
      access: "staff and admin",
    });
  },
);

authRouter.get(
  "/lands/dashboard",
  authenticateSession,
  requireDivision("Lands"),
  (_request, response) => {
    response.status(200).json({
      message: "Lands division dashboard",
      access: "Lands division members only",
    });
  },
);

authRouter.get(
  "/it/dashboard",
  authenticateSession,
  requireDivision("IT"),
  (_request, response) => {
    response.status(200).json({
      message: "IT division dashboard",
      access: "IT division members only",
    });
  },
);

authRouter.get(
  "/admin/lands",
  authenticateSession,
  requireAccess({ roles: ["admin"], divisions: ["Lands"] }),
  (_request, response) => {
    response.status(200).json({
      message: "Admin + Lands division resource",
      access: "admin role AND Lands division membership required",
    });
  },
);

export default authRouter;
