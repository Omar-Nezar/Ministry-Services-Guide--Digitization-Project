import type { Request, Response } from "express";
import { prisma } from "@db";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";
import {
  defaultFeedbackQuestions,
  parseFeedbackSurveyConfig,
  type FeedbackRespondentType,
  type FeedbackSurveyConfig,
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
  survey: FeedbackSurveyConfig = defaultFeedbackQuestions,
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

  const questions = survey[respondentType].filter(
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
      if (answer !== "" && !question.options.some((option) => option.value === answer)) return null;
    } else if (answer.length > question.maxLength || (question.required && !answer.trim())) {
      return null;
    }
    if (question.required && !answer) return null;
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

async function loadFeedbackSurvey(): Promise<FeedbackSurveyConfig> {
  const saved = await prisma.feedbackSurvey.findMany();
  let staff: unknown = defaultFeedbackQuestions.staff;
  let recipient: unknown = defaultFeedbackQuestions.recipient;
  for (const row of saved) {
    let questions: unknown;
    try {
      questions = JSON.parse(row.questions) as unknown;
    } catch (error: unknown) {
      throw new Error(`Saved ${row.respondentType} feedback survey JSON is invalid.`, { cause: error });
    }
    if (row.respondentType === "staff") staff = questions;
    else if (row.respondentType === "recipient") recipient = questions;
    else throw new Error(`Unknown feedback respondent type "${row.respondentType}".`);
  }
  const config = parseFeedbackSurveyConfig({ staff, recipient });
  if (!config) throw new Error("The saved feedback survey configuration is invalid.");
  return config;
}

export async function getFeedbackSurvey(_request: Request, response: Response): Promise<void> {
  try {
    response.json(await loadFeedbackSurvey());
  } catch (error: unknown) {
    console.error("Failed to load feedback survey.", error);
    response.status(500).json({ error: "Unable to load the feedback survey right now." });
  }
}

export async function updateFeedbackSurvey(request: Request, response: Response): Promise<void> {
  const survey = parseFeedbackSurveyConfig(request.body);
  if (!survey) {
    response.status(400).json({ error: "The feedback survey configuration is invalid." });
    return;
  }

  try {
    await prisma.$transaction(
      (Object.keys(survey) as FeedbackRespondentType[]).map((respondentType) =>
        prisma.feedbackSurvey.upsert({
          where: { respondentType },
          create: { respondentType, questions: JSON.stringify(survey[respondentType]) },
          update: { questions: JSON.stringify(survey[respondentType]) },
        }),
      ),
    );
    response.json(survey);
  } catch (error: unknown) {
    console.error("Failed to save feedback survey.", error);
    response.status(500).json({ error: "Unable to save the feedback survey right now." });
  }
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
  let survey: FeedbackSurveyConfig;
  try {
    survey = await loadFeedbackSurvey();
  } catch (error: unknown) {
    console.error("Failed to load feedback survey for submission.", error);
    response.status(500).json({ error: "Unable to accept feedback right now." });
    return;
  }
  const submission = parseSubmission(request.body, identifiedRespondentType, survey);
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
