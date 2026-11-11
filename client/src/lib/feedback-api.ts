import api from "@/slices/base";
import type { FeedbackRespondentType, FeedbackSurveyConfig } from "@shared/feedback";

export type FeedbackSubmission = {
  respondentType: FeedbackRespondentType;
  email?: string;
  answers: Record<string, string>;
};

export const feedbackApi = {
  questions: () => api.get<FeedbackSurveyConfig>("/feedback/questions").then((r) => r.data),
  validateStaffEmail: (email: string) =>
    api.post<{ valid: true }>("/feedback/validate-staff-email", { email }),
  submit: (submission: FeedbackSubmission) => api.post("/feedback", submission),
};
