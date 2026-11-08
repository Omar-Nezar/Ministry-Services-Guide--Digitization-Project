import { Router } from "express";
import {
  submitFeedback,
  validateStaffEmail,
} from "../controllers/feedback.controller.js";
import { authenticateOptionalSession } from "../middlewares/auth.middleware.js";

const feedbackRouter = Router();

feedbackRouter.post("/validate-staff-email", authenticateOptionalSession, validateStaffEmail);
feedbackRouter.post("/", authenticateOptionalSession, submitFeedback);

export default feedbackRouter;
