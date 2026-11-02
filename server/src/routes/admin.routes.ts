import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/rbac.middleware.js";

const adminRouter = Router();

adminRouter.use(authenticateSession, requireRole("admin"));

adminRouter.get("/dashboard", admin.getDashboard);

adminRouter.get("/staff", admin.listStaff);
adminRouter.patch("/staff/:id", admin.updateStaff);
adminRouter.delete("/staff/:id", admin.deleteStaff);

export default adminRouter;
