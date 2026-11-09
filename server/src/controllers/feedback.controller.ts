import type { Request, Response } from "express";
import { prisma } from "@db";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";
import {
  feedbackQuestions,
  type FeedbackRespondentType,
} from "@shared/feedback";

type FeedbackSubmission = {
  respondentType: FeedbackRespondentType;
  email?: string;
  answers: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSubmission(
  value: unknown,
  identifiedRespondentType?: FeedbackRespondentType,
): FeedbackSubmission | null {
  if (!isRecord(value)) return null;
  const respondentType =
    identifiedRespondentType ??
    (value.respondentType === "staff" || value.respondentType === "recipient"
      ? value.respondentType
      : null);
  if (!respondentType) {
    return null;
  }
  if (!isRecord(value.answers)) return null;

  const questions = feedbackQuestions[respondentType].filter(
    (question) => question.type !== "section",
  );
  const answerIds = new Set<string>(questions.map((question) => question.id));
  const answerEntries = Object.entries(value.answers);
  if (
    answerEntries.length !== answerIds.size ||
    answerEntries.some(([id]) => !answerIds.has(id))
  ) {
    return null;
  }

  const answers: Record<string, string> = {};
  for (const question of questions) {
    const answer = value.answers[question.id];
    if (typeof answer !== "string") return null;
    if (question.type === "choice") {
      if (!question.options.some((option) => option.value === answer)) return null;
    } else if (answer.length > question.maxLength) {
      return null;
    }
    answers[question.id] = answer;
  }

  if (typeof value.email !== "undefined" && typeof value.email !== "string") {
    return null;
  }
  return {
    respondentType,
    ...(typeof value.email === "string" ? { email: value.email.trim() } : {}),
    answers,
  };
}

function isMinistryStaff(roles: readonly string[]): boolean {
  return roles.includes("staff") || roles.includes("admin");
}

export async function validateStaffEmail(
  request: Request,
  response: Response,
): Promise<void> {
  const email =
    isRecord(request.body) && typeof request.body.email === "string"
      ? request.body.email.trim().toLowerCase()
      : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    response.status(400).json({
      error: "Enter a valid Ministry staff email address.",
      code: "INVALID_STAFF_EMAIL",
    });
    return;
  }

  try {
    const staffAccount = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        roles: { some: { role: { name: { in: ["staff", "admin"] } } } },
      },
      select: { id: true },
    });
    if (!staffAccount) {
      response.status(404).json({
        error: "This email is not linked to an active Ministry staff account.",
        code: "STAFF_EMAIL_NOT_FOUND",
      });
      return;
    }

    response.status(200).json({ valid: true });
  } catch (error: unknown) {
    console.error("Failed to validate Ministry staff email.", error);
    response.status(500).json({ error: "Unable to validate this email right now." });
  }
}

export async function submitFeedback(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const identifiedRespondentType =
    request.user && isMinistryStaff(request.user.roles) ? "staff" : undefined;
  const submission = parseSubmission(request.body, identifiedRespondentType);
  if (!submission) {
    response.status(400).json({ error: "The feedback answers are invalid." });
    return;
  }

  try {
    let respondentType = submission.respondentType;
    let userId: number | null = null;
    let email: string | null = null;

    if (request.user && isMinistryStaff(request.user.roles)) {
      respondentType = "staff";
      userId = request.user.userId;
      email = request.user.email;
    } else if (respondentType === "staff") {
      const staffEmail = submission.email?.toLowerCase();
      if (!staffEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail) || staffEmail.length > 320) {
        response.status(400).json({ error: "Enter a valid Ministry staff email address." });
        return;
      }

      const staffAccount = await prisma.user.findFirst({
        where: {
          email: staffEmail,
          isActive: true,
          roles: { some: { role: { name: { in: ["staff", "admin"] } } } },
        },
        select: { id: true, email: true },
      });
      if (!staffAccount) {
        response.status(400).json({
          error: "This email is not linked to an active Ministry staff account.",
        });
        return;
      }
      userId = staffAccount.id;
      email = staffAccount.email;
    }

    await prisma.feedbackResponse.create({
      data: {
        respondentType,
        email,
        userId,
        answers: JSON.stringify(submission.answers),
      },
    });
    response.status(201).json({ message: "Feedback submitted successfully." });
  } catch (error: unknown) {
    console.error("Failed to save feedback response.", error);
    response.status(500).json({ error: "Unable to save feedback right now." });
  }
}
