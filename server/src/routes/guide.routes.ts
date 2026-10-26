import { Router } from "express";
import { getDivision, getFlowchart, getService, getTree } from "../controllers/guide.controller.js";

const guideRouter = Router();

guideRouter.get("/tree", getTree);
guideRouter.get("/divisions/:id", getDivision);
guideRouter.get("/services/:id", getService);
guideRouter.get("/flowcharts/:id", getFlowchart);

export default guideRouter;
