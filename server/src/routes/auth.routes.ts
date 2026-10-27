import { Router } from "express";
import {
  loginUser,
  getCurrentUser,
  deleteUser,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  requireRole,
  requireDivision,
  requireAccess,
} from "../middlewares/rbac.middleware.js";

const authRouter = Router();

authRouter.post("/login", loginUser);

// Protected routes (require a valid JWT in the Authorization: Bearer <token> header)
authRouter.get("/me", authenticateToken, getCurrentUser);

authRouter.get("/admin/dashboard", authenticateToken, requireRole("admin"), (_request, response) => {
  response.status(200).json({
    message: "Admin dashboard",
    access: "full",
  });
},
);
// Delete a user - requires admin credentials
authRouter.delete("/users/:email", authenticateToken, requireRole("admin"), deleteUser);

authRouter.get("/staff/dashboard", authenticateToken, requireRole("staff", "admin"), (_request, response) => {
  response.status(200).json({
    message: "Staff dashboard",
    access: "staff and admin",
  });
},
);

authRouter.get("/lands/dashboard", authenticateToken, requireDivision("Lands"), (_request, response) => {
  response.status(200).json({
    message: "Lands division dashboard",
    access: "Lands division members only",
  });
},
);

authRouter.get("/it/dashboard", authenticateToken, requireDivision("IT"), (_request, response) => {
  response.status(200).json({
    message: "IT division dashboard",
    access: "IT division members only",
  });
},
);

// Combined role + division: only admins who are also in the Lands division
authRouter.get("/admin/lands", authenticateToken, requireAccess({ roles: ["admin"], divisions: ["Lands"] }), (_request, response) => {
  response.status(200).json({
    message: "Admin + Lands division resource",
    access: "admin role AND Lands division membership required",
  });
},
);

export default authRouter;