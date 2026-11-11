import { Router } from "express";
import {
  getFeedbackSurvey,
  submitFeedback,
  validateStaffEmail,
} from "../controllers/feedback.controller.js";
import { authenticateOptionalSession } from "../middlewares/auth.middleware.js";

const feedbackRouter = Router();

feedbackRouter.get("/questions", getFeedbackSurvey);
feedbackRouter.post("/validate-staff-email", authenticateOptionalSession, validateStaffEmail);
feedbackRouter.post("/", authenticateOptionalSession, submitFeedback);

export default feedbackRouter;
