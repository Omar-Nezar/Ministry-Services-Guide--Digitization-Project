import api from "@/slices/base";
import type { FeedbackRespondentType } from "@shared/feedback";

export type FeedbackSubmission = {
  respondentType: FeedbackRespondentType;
  email?: string;
  answers: Record<string, string>;
};

export const feedbackApi = {
  validateStaffEmail: (email: string) =>
    api.post<{ valid: true }>("/feedback/validate-staff-email", { email }),
  submit: (submission: FeedbackSubmission) => api.post("/feedback", submission),
};
