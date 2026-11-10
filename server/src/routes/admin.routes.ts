import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import * as pdf from "../controllers/pdf.controller.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/rbac.middleware.js";
import { uploadImage } from "../middlewares/upload.middleware.js";

const adminRouter = Router();

adminRouter.use(authenticateSession, requireRole("admin"));

adminRouter.get("/dashboard", admin.getDashboard);
adminRouter.get("/updates", admin.listUpdates);

adminRouter.get("/staff", admin.listStaff);
adminRouter.post("/staff", admin.createStaff);
adminRouter.patch("/staff/:id", admin.updateStaff);
adminRouter.delete("/staff/:id", admin.deleteStaff);

// Pages added to the exported PDF (reading them is public: /guide/pdf-pages)
adminRouter.put("/pdf-settings", pdf.updatePdfSettings);
adminRouter.post("/pdf-pages", uploadImage, pdf.createPdfPage);
adminRouter.put("/pdf-pages/order", pdf.reorderPdfPages);
adminRouter.patch("/pdf-pages/:id", pdf.updatePdfPage);
adminRouter.delete("/pdf-pages/:id", pdf.deletePdfPage);

export default adminRouter;
