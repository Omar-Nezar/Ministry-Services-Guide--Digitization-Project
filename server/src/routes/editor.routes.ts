import { Router } from "express";
import * as editor from "../controllers/editor.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/rbac.middleware.js";
import { uploadImage } from "../middlewares/upload.middleware.js";

const editorRouter = Router();

// Admin and staff only. Which category a staff member may change is checked in the controller.
editorRouter.use(authenticateToken, requireRole("staff", "admin"));

editorRouter.get("/tree", editor.getTree);
editorRouter.put("/divisions/order", requireRole("admin"), editor.reorderDivisions);
editorRouter.patch("/divisions/:id", editor.updateDivision);
editorRouter.post("/divisions/:divisionId/services", editor.createService);
editorRouter.put("/services/arrangement", editor.arrangeServices);

editorRouter.get("/services/:id", editor.getService);
editorRouter.patch("/services/:id", editor.renameService);
editorRouter.delete("/services/:id", editor.deleteService);
editorRouter.put("/services/:id/sections/:key", editor.saveSection);

editorRouter.post("/services/:id/flowcharts", editor.createFlowchart);
editorRouter.put("/services/:id/flowcharts/order", editor.reorderFlowcharts);
editorRouter.patch("/flowcharts/:id", editor.updateFlowchart);
editorRouter.delete("/flowcharts/:id", editor.deleteFlowchart);

editorRouter.post("/services/:id/images", uploadImage, editor.createImage);
editorRouter.put("/services/:id/images/order", editor.reorderImages);
editorRouter.post("/images/:id/file", uploadImage, editor.replaceImage);
editorRouter.patch("/images/:id", editor.updateImage);
editorRouter.delete("/images/:id", editor.deleteImage);

// The label library is shared by every service: only admins change it
editorRouter.get("/labels", editor.getLabels);
editorRouter.post("/labels", requireRole("admin"), editor.createLabel);
editorRouter.put("/labels/order", requireRole("admin"), editor.reorderLabels);
editorRouter.patch("/labels/:id", requireRole("admin"), editor.updateLabel);
editorRouter.delete("/labels/:id", requireRole("admin"), editor.deleteLabel);

editorRouter.get("/label-colors", editor.getLabelColors);
editorRouter.put("/label-colors", editor.setLabelColor);
editorRouter.delete("/label-colors/:divisionId", editor.clearLabelColors);

export default editorRouter;
