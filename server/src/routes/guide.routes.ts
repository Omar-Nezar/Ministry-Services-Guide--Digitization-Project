import { Router } from "express";
import { getPdfSettings, listPdfPages } from "../controllers/pdf.controller.js";
import { getDivision, getFlowchart, getService, getTree } from "../controllers/guide.controller.js";

const guideRouter = Router();

guideRouter.get("/tree", getTree);
guideRouter.get("/divisions/:id", getDivision);
guideRouter.get("/services/:id", getService);
guideRouter.get("/flowcharts/:id", getFlowchart);

guideRouter.get("/pdf-pages", listPdfPages);
guideRouter.get("/pdf-settings", getPdfSettings);

export default guideRouter;
