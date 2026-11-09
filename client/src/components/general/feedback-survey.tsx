import { useState, type SubmitEvent } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router";
import axios from "axios";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import { feedbackApi } from "@/lib/feedback-api";
import {
  feedbackQuestions,
  type FeedbackRespondentType,
} from "@shared/feedback";
import type { RootState } from "@/store/store";

const respondentTypes: {
  value: FeedbackRespondentType;
  label: string;
  labelAr: string;
}[] = [
  { value: "staff", label: "Ministry staff", labelAr: "موظف في الوزارة" },
  { value: "recipient", label: "Service recipient", labelAr: "مستفيد من الخدمات" },
];

function getErrorMessage(error: unknown, isArabic: boolean): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === "string") return message;
  }
  return isArabic
    ? "تعذر إرسال ملاحظاتك. يرجى التحقق من الاتصال والمحاولة مرة أخرى."
    : "We couldn't submit your feedback. Check your connection and try again.";
}

function getFirstStepId(respondentType: FeedbackRespondentType): string {
  const firstStep = feedbackQuestions[respondentType][0];
  if (!firstStep) {
    throw new Error(`No feedback survey steps configured for ${respondentType}.`);
  }
  return firstStep.id;
}

export function FeedbackSurvey() {
  const { isArabic } = useLanguage();
  const user = useSelector((state: RootState) => state.auth.user);
  const isStaff = user?.roles.some((role) => role === "staff" || role === "admin") ?? false;
  const [respondentType, setRespondentType] = useState<FeedbackRespondentType | null>(
    isStaff ? "staff" : null,
  );
  const [staffEmail, setStaffEmail] = useState("");
  const [emailAccepted, setEmailAccepted] = useState(isStaff);
  const [emailError, setEmailError] = useState("");
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState(
    isStaff ? getFirstStepId("staff") : "respondentType",
  );

  const roleItems = [
    {
      name: "respondentType",
      required: true,
      prompt: isArabic ? "هل أنت موظف أم مستفيد من الخدمات؟" : "Are you a staff member or a service recipient?",
    },
  ] as const;

  const surveyItems = respondentType ? feedbackQuestions[respondentType] : [];
  const questions = surveyItems.filter((item) => item.type !== "section");
  const surveySections = surveyItems.filter((item) => item.type === "section");
  const activeSectionStep = surveyItems.find(
    (item) => item.type === "section" && item.id === activeQuestion,
  );
  const sectionByQuestion = new Map<
    string,
    Extract<(typeof surveyItems)[number], { type: "section" }>
  >();
  let currentSection: Extract<(typeof surveyItems)[number], { type: "section" }> | undefined;
  for (const item of surveyItems) {
    if (item.type === "section") {
      currentSection = item;
    } else if (currentSection) {
      sectionByQuestion.set(item.id, currentSection);
    }
  }
  const activeSection = sectionByQuestion.get(activeQuestion);
  const activeStepIndex = surveyItems.findIndex((item) => item.id === activeQuestion);
  const nextSurveyStep = surveyItems[activeStepIndex + 1];
  const activeQuestionNumber = questions.findIndex(
    (question) => question.id === activeQuestion,
  ) + 1;
  const questionItems = surveyItems.map((item) => ({
    name: item.id,
    required: item.type === "section" ? false : item.required,
    prompt:
      item.type === "section"
        ? isArabic ? item.titleAr : item.title
        : isArabic ? item.promptAr : item.prompt,
    ...(item.type === "choice"
      ? {
          choices: item.options.map((option) => ({
            value: option.value,
            label: isArabic ? option.labelAr : option.label,
          })),
        }
      : {}),
  }));

  function chooseRespondent(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const choice = new FormData(event.currentTarget).get("respondentType");
    if (choice !== "staff" && choice !== "recipient") return;
    setRespondentType(choice);
    setActiveQuestion(getFirstStepId(choice));
    setEmailAccepted(choice === "recipient");
    setEmailError("");
    setSubmitError("");
  }

  async function continueWithStaffEmail(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = staffEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
      setEmailError(
        isArabic
          ? "أدخل بريدًا إلكترونيًا صحيحًا للموظفين."
          : "Enter a valid staff email address.",
      );
      return;
    }
    setEmailError("");
    setValidatingEmail(true);
    try {
      await feedbackApi.validateStaffEmail(email);
      setStaffEmail(email);
      setEmailAccepted(true);
      setActiveQuestion(getFirstStepId("staff"));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const code = error.response?.data?.code;
        if (code === "STAFF_EMAIL_NOT_FOUND") {
          setEmailError(
            isArabic
              ? "هذا البريد غير مرتبط بحساب موظف نشط في الوزارة."
              : "This email is not linked to an active Ministry staff account.",
          );
        } else if (code === "INVALID_STAFF_EMAIL") {
          setEmailError(
            isArabic
              ? "أدخل بريدًا إلكترونيًا صحيحًا للموظفين."
              : "Enter a valid staff email address.",
          );
        } else {
          setEmailError(getErrorMessage(error, isArabic));
        }
      } else {
        setEmailError(getErrorMessage(error, isArabic));
      }
    } finally {
      setValidatingEmail(false);
    }
  }

  function showReview(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewing(true);
  }

  async function submitAnswers() {
    if (!respondentType || !emailAccepted || submitting) return;

    const unansweredRequiredQuestion = questions.find(
      (question) => question.required && !answersByQuestion[question.id],
    );
    if (unansweredRequiredQuestion) {
      setSubmitError(
        isArabic
          ? "يرجى الإجابة عن جميع الأسئلة المطلوبة قبل إرسال الاستبيان."
          : "Please answer all required questions before submitting the survey.",
      );
      return;
    }

    const answers = Object.fromEntries(
      questions.map((question) => [
        question.id,
        answersByQuestion[question.id] ?? "",
      ]),
    );
    setSubmitting(true);
    setSubmitError("");
    try {
      await feedbackApi.submit({
        respondentType,
        ...(respondentType === "staff" && !isStaff ? { email: staffEmail.trim() } : {}),
        answers,
      });
      setSubmitted(true);
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error, isArabic));
    } finally {
      setSubmitting(false);
    }
  }
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <>
      <Header />
      <main className="relative isolate flex min-h-[calc(100vh-4.5rem)] items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-primary/8 to-transparent"
        />
        <div className="my-auto w-full max-w-2xl">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BackIcon aria-hidden="true" className="size-4" />
            {isArabic ? "العودة إلى الرئيسية" : "Back to home"}
          </Link>

          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 aria-hidden="true" className="mx-auto size-12 text-primary" />
                <h1 className="mt-4 text-2xl font-semibold">
                  {isArabic ? "شكرًا لملاحظاتك" : "Thank you for your feedback"}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {isArabic
                    ? "تساعدنا إجاباتك على تحسين خدمات الوزارة."
                    : "Your answers will help us improve Ministry services."}
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isArabic ? "العودة إلى الرئيسية" : "Return home"}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {isArabic ? "استبيان الملاحظات" : "Feedback survey"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isArabic
                    ? "شاركنا رأيك لمساعدتنا على تطوير دليل الخدمات."
                    : "Tell us what you think to help improve the services catalogue."}
                </p>
                {respondentType && emailAccepted && !reviewing && !activeSectionStep && activeSection && (
                  <div
                    className="mt-4 flex flex-col gap-0.5 rounded-lg border bg-muted/40 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
                    role="status"
                    aria-atomic="true"
                  >
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {isArabic ? "القسم الحالي" : "CURRENT SECTION"}
                    </span>
                    <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">
                      /
                    </span>
                    <span className="text-sm font-medium">
                      {isArabic ? activeSection.titleAr : activeSection.title}
                    </span>
                  </div>
                )}
                {user && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
                    {isArabic ? "تم التعرف عليك باستخدام حسابك:" : "Identified using your signed-in account:"}{" "}
                    <span className="font-medium" dir="ltr">{user.email}</span>
                  </p>
                )}

                {!respondentType ? (
                  <Questionnaire
                    className="mt-6"
                    items={roleItems}
                    onSubmit={chooseRespondent}
                  >
                    <QuestionnaireProgress />
                    <QuestionnaireItem name="respondentType" required>
                      <QuestionnaireTitle>
                        {roleItems[0].prompt}
                      </QuestionnaireTitle>
                      <QuestionnaireChoices>
                        {respondentTypes.map(({ value, label, labelAr }) => (
                          <QuestionnaireChoice key={value} value={value}>
                            {isArabic ? labelAr : label}
                          </QuestionnaireChoice>
                        ))}
                      </QuestionnaireChoices>
                      <QuestionnaireError />
                    </QuestionnaireItem>
                    <QuestionnaireActions>
                      <QuestionnaireSubmit>
                        {isArabic ? "متابعة" : "Continue"}
                      </QuestionnaireSubmit>
                    </QuestionnaireActions>
                  </Questionnaire>
                ) : respondentType === "staff" && !emailAccepted ? (
                  <form onSubmit={continueWithStaffEmail} className="mt-6 space-y-4">
                    <label htmlFor="staff-email" className="block text-sm font-medium">
                      {isArabic ? "بريد الوزارة الإلكتروني" : "Ministry staff email"}
                    </label>
                    <input
                      id="staff-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={320}
                      value={staffEmail}
                      onChange={(event) => {
                        setStaffEmail(event.target.value);
                        setEmailError("");
                      }}
                      aria-invalid={Boolean(emailError)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    {emailError && <p role="alert" className="text-sm text-destructive">{emailError}</p>}
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? "سيتم التحقق من البريد ومطابقته مع حساب موظف نشط عند إرسال الاستبيان."
                        : "We'll match this address to an active staff account when you submit the survey."}
                    </p>
                    <button
                      type="submit"
                      disabled={validatingEmail}
                      className="min-h-11 rounded-lg bg-primary px-4 font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      {validatingEmail
                        ? isArabic ? "جارٍ التحقق..." : "Checking..."
                        : isArabic ? "متابعة" : "Continue"}
                    </button>
                  </form>
                ) : (
                  <>
                  {reviewing && (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {isArabic ? "مراجعة إجاباتك" : "Review your answers"}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isArabic
                          ? "يمكنك تعديل أي إجابة قبل إرسال الاستبيان."
                          : "You can edit any answer before submitting the survey."}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {surveySections.map((section) => {
                        const sectionQuestions = questions.filter(
                          (question) => sectionByQuestion.get(question.id)?.id === section.id,
                        );

                        return (
                          <section
                            key={section.id}
                            className="rounded-xl border p-4"
                            aria-labelledby={`feedback-review-${section.id}`}
                          >
                            <h3
                              id={`feedback-review-${section.id}`}
                              className="font-semibold"
                            >
                              {isArabic ? section.titleAr : section.title}
                            </h3>
                            {(isArabic ? section.descriptionAr : section.description) && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {isArabic ? section.descriptionAr : section.description}
                              </p>
                            )}
                            <dl className="mt-3 space-y-3">
                              {sectionQuestions.map((question) => {
                                const answer = answersByQuestion[question.id] ?? "";
                                const summary =
                                  question.type === "choice"
                                    ? question.options.find((option) => option.value === answer)
                                    : null;
                                const answerLabel =
                                  question.type === "choice"
                                    ? summary
                                      ? isArabic ? summary.labelAr : summary.label
                                      : isArabic ? "بدون إجابة" : "No answer"
                                    : answer.trim()
                                      ? answer
                                      : isArabic ? "تم التخطي" : "Skipped";

                                return (
                                  <div
                                    key={question.id}
                                    className="rounded-lg border bg-background p-4"
                                  >
                                    <dt className="font-medium">
                                      {isArabic ? question.promptAr : question.prompt}
                                    </dt>
                                    <dd className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                      {answerLabel}
                                    </dd>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSubmitError("");
                                        setActiveQuestion(question.id);
                                        setReviewing(false);
                                      }}
                                      className="mt-3 min-h-9 rounded-md px-2 text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      {isArabic ? "تعديل الإجابة" : "Edit answer"}
                                    </button>
                                  </div>
                                );
                              })}
                            </dl>
                          </section>
                        );
                      })}
                    </div>
                    {submitError && (
                      <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {submitError}
                      </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitError("");
                          setActiveQuestion(questions[questions.length - 1].id);
                          setReviewing(false);
                        }}
                        className="min-h-11 rounded-lg border px-4 font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isArabic ? "العودة إلى الأسئلة" : "Back to questions"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitAnswers()}
                        disabled={submitting}
                        className="min-h-11 rounded-lg bg-primary px-4 font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      >
                        {submitting
                          ? isArabic ? "جارٍ الإرسال..." : "Submitting..."
                          : isArabic ? "إرسال الاستبيان" : "Submit survey"}
                      </button>
                    </div>
                  </div>
                  )}
                  <Questionnaire
                    className={reviewing ? "mt-6 hidden" : "mt-6"}
                    item={activeQuestion}
                    items={questionItems}
                    onItemChange={setActiveQuestion}
                    onSubmit={showReview}
                  >
                    {!activeSectionStep && activeQuestionNumber > 0 && (
                      <p
                        aria-live="polite"
                        className="min-h-lh w-fit min-w-[14ch] text-xs font-medium text-muted-foreground tabular-nums"
                      >
                        {isArabic
                          ? `السؤال ${activeQuestionNumber} من ${questions.length}`
                          : `Question ${activeQuestionNumber} of ${questions.length}`}
                      </p>
                    )}
                    {surveyItems.map((item) => {
                      if (item.type === "section") {
                        return (
                          <QuestionnaireItem
                            key={item.id}
                            name={item.id}
                            required={false}
                          >
                            <section
                              aria-labelledby={`feedback-section-${item.id}`}
                              className="space-y-4 border-y border-border/70 py-6"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold tracking-[0.16em] text-primary">
                                  {isArabic ? "القسم" : "SECTION"}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="h-px flex-1 bg-border"
                                />
                              </div>
                              <h2
                                id={`feedback-section-${item.id}`}
                                className="text-xl font-semibold tracking-tight"
                              >
                                {isArabic ? item.titleAr : item.title}
                              </h2>
                              {(isArabic ? item.descriptionAr : item.description) && (
                                <p className="max-w-prose text-sm leading-6 text-muted-foreground">
                                  {isArabic ? item.descriptionAr : item.description}
                                </p>
                              )}
                            </section>
                          </QuestionnaireItem>
                        );
                      }

                      const question = item;
                      return (
                        <QuestionnaireItem
                          key={question.id}
                          name={question.id}
                          required={question.required}
                        >
                          <QuestionnaireTitle>
                            {isArabic ? question.promptAr : question.prompt}
                          </QuestionnaireTitle>
                          {question.type === "choice" ? (
                            <QuestionnaireChoices>
                              {question.options.map((option) => (
                                <QuestionnaireChoice
                                  key={option.value}
                                  value={option.value}
                                  checked={answersByQuestion[question.id] === option.value}
                                  onChange={(event) => {
                                    if (event.currentTarget.checked) {
                                      setAnswersByQuestion((current) => ({
                                        ...current,
                                        [question.id]: option.value,
                                      }));
                                      setSubmitError("");
                                    }
                                  }}
                                >
                                  {isArabic ? option.labelAr : option.label}
                                </QuestionnaireChoice>
                              ))}
                            </QuestionnaireChoices>
                          ) : (
                            <>
                              <QuestionnaireDescription>
                                {isArabic
                                  ? `يمكنك كتابة ما يصل إلى ${question.maxLength} حرفًا.`
                                  : `Share as much detail as you'd like, up to ${question.maxLength} characters.`}
                              </QuestionnaireDescription>
                              <QuestionnaireInput
                                aria-label={isArabic ? question.promptAr : question.prompt}
                                value={answersByQuestion[question.id] ?? ""}
                                onChange={(event) => {
                                  const value = event.currentTarget.value;
                                  setAnswersByQuestion((current) => ({
                                    ...current,
                                    [question.id]: value,
                                  }));
                                  setSubmitError("");
                                }}
                                maxLength={question.maxLength}
                                render={
                                  <textarea
                                    rows={6}
                                    placeholder={
                                      isArabic
                                        ? "اكتب ملاحظاتك هنا..."
                                        : "Write your feedback here..."
                                    }
                                    className="min-h-36 w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                  />
                                }
                              />
                            </>
                          )}
                          <QuestionnaireError />
                        </QuestionnaireItem>
                      );
                    })}
                    {submitError && (
                      <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {submitError}
                      </p>
                    )}
                    <QuestionnaireActions>
                      <QuestionnairePrevious>
                        {isArabic ? "السابق" : "Previous"}
                      </QuestionnairePrevious>
                      {!activeSectionStep && nextSurveyStep && (
                        <QuestionnaireSkip>
                          {isArabic ? "تخطي" : "Skip"}
                        </QuestionnaireSkip>
                      )}
                      {!activeSectionStep && !nextSurveyStep && (
                        <button
                          type="button"
                          onClick={() => setReviewing(true)}
                          className="col-start-2 row-start-1 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                        >
                          {isArabic ? "تخطي" : "Skip"}
                        </button>
                      )}
                      {!activeSectionStep && nextSurveyStep && (
                        <QuestionnaireNext>
                          {isArabic ? "التالي" : "Next"}
                        </QuestionnaireNext>
                      )}
                      {activeSectionStep && nextSurveyStep && (
                        <button
                          type="button"
                          onClick={() => setActiveQuestion(nextSurveyStep.id)}
                          className="col-start-3 row-start-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:min-h-8"
                        >
                          {isArabic ? "متابعة" : "Continue"}
                        </button>
                      )}
                      {!nextSurveyStep && (
                        <button
                          type="button"
                          onClick={() => setReviewing(true)}
                          className="col-start-3 row-start-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                        >
                          {isArabic ? "مراجعة الإجابات" : "Review answers"}
                        </button>
                      )}
                    </QuestionnaireActions>
                  </Questionnaire>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
