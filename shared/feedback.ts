export type FeedbackRespondentType = "staff" | "recipient";

export type FeedbackChoice = {
  value: string;
  label: string;
  labelAr: string;
};

export type FeedbackQuestion =
  | {
    id: string;
    type: "section";
    title: string;
    titleAr: string;
    description?: string;
    descriptionAr?: string;
  }
  | {
    id: string;
    type: "choice";
    prompt: string;
    promptAr: string;
    required: boolean;
    options: readonly FeedbackChoice[];
  }
  | {
    id: string;
    type: "text";
    prompt: string;
    promptAr: string;
    required: boolean;
    maxLength: number;
  };

export type FeedbackSurveyConfig = Record<FeedbackRespondentType, FeedbackQuestion[]>;

const yesNoOptions = [
  { value: "yes", label: "Yes", labelAr: "نعم" },
  { value: "partly", label: "Partly", labelAr: "إلى حد ما" },
  { value: "no", label: "No", labelAr: "لا" },
] as const;

const satisfactionOptions = [
  { value: "very_satisfied", label: "Very satisfied", labelAr: "راضٍ جدًا" },
  { value: "satisfied", label: "Satisfied", labelAr: "راضٍ" },
  { value: "neutral", label: "Neutral", labelAr: "محايد" },
  { value: "dissatisfied", label: "Dissatisfied", labelAr: "غير راضٍ" },
  { value: "very_dissatisfied", label: "Very dissatisfied", labelAr: "غير راضٍ جدًا" },
] as const;

const experienceOptions = [
  { value: "beginner", label: "Beginner", labelAr: "مبتدئ" },
  { value: "amateur", label: "Amateur", labelAr: "هاوٍ" },
  { value: "modest", label: "Modest", labelAr: "متوسط الخبرة" },
  { value: "professional", label: "Professional", labelAr: "محترف" },
  { value: "expert", label: "Expert", labelAr: "خبير" },
] as const;

const frequencyOptions = [
  { value: "very_frequently", label: "Very frequently", labelAr: "بشكل متكرر جدًا" },
  { value: "frequently", label: "Frequently", labelAr: "بشكل متكرر" },
  { value: "occasionally", label: "Occasionally", labelAr: "أحيانًا" },
  { value: "rarely", label: "Rarely", labelAr: "نادرًا" },
  { value: "very_rarely", label: "Very rarely", labelAr: "نادرًا جدًا" },
] as const;

const feedbackLimit = 4000;

// These defaults initialize a new survey; saved survey definitions live in the database.
export const defaultFeedbackQuestions: FeedbackSurveyConfig = {
  staff: [
    {
      id: "staff_workflows_section",
      type: "section",
      title: "Service workflows",
      titleAr: "إجراءات الخدمات",
      description: "Tell us whether the service workflows are clear and easy to maintain.",
      descriptionAr: "أخبرنا عن مدى وضوح إجراءات الخدمات وسهولة تحديثها.",
    },
    {
      id: "staff_workflow_clarity",
      type: "choice",
      prompt: "Are the service workflows clear and easy to maintain?",
      promptAr: "هل إجراءات العمل الخاصة بالخدمات واضحة وسهلة الصيانة؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "staff_workflow_tools",
      type: "choice",
      prompt: "Are all the tools you need to maintain the service workflows available?",
      promptAr: "هل تتوفر جميع الأدوات اللازمة لصيانة إجراءات العمل الخاصة بالخدمات؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "staff_workflow_understanding",
      type: "choice",
      prompt: "Are the interfaces clear and easy to understand?",
      promptAr: "هل الواجهات واضحة وسهلة الفهم؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "staff_experience_section",
      type: "section",
      title: "Your experience",
      titleAr: "تجربتك",
      description: "Next, tell us how satisfied you are with the Ministry's tools and your experience.",
      descriptionAr: "أخبرنا الآن عن مدى رضاك عن أدوات الوزارة وتجربتك.",
    },
    {
      id: "staff_experience_choice",
      type: "choice",
      prompt: "Please indicate your level of experience with the program",
      promptAr: "يرجى تحديد مستوى خبرتك في استخدام البرنامج.",
      required: true,
      options: experienceOptions,
    },
    {
      id: "staff_navigation_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the website's navigation?",
      promptAr: "ما مدى رضاك عن سهولة التنقل في الموقع؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "staff_speed_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the website's speed? Do you feel your work has been sped up by using the website?",
      promptAr: "ما مدى رضاك عن سرعة الموقع؟ وهل تشعر أن استخدام الموقع قد سرّع إنجاز عملك؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "staff_intuitiveness_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the website's intuitiveness and ease of use? Were you able to begin using the program in a short time without training?",
      promptAr: "ما مدى رضاك عن سهولة استخدام الموقع ووضوحه؟ وهل تمكنت من البدء باستخدام البرنامج خلال وقت قصير ودون تدريب؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "staff_accessibility_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the website's accessibility? (e.g. for people with disabilities, or using mobile devices)",
      promptAr: "ما مدى رضاك عن سهولة الوصول إلى الموقع (مثلًا للأشخاص ذوي الإعاقة أو مستخدمي الأجهزة المحمولة)؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "staff_ui_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the website's visual design and customizations?",
      promptAr: "ما مدى رضاك عن التصميم المرئي للموقع وإمكانية تخصيصه؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "staff_overall_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the staff experience overall?",
      promptAr: "ما مدى رضاك عن تجربة الموظفين؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "staff_additional_feedback_section",
      type: "section",
      title: "Additional feedback",
      titleAr: "ملاحظات إضافية",
      description: "Share any suggestions you have for improving the experience.",
      descriptionAr: "شاركنا أي اقتراحات لديك لتحسين التجربة.",
    },
    {
      id: "staff_additional_feedback",
      type: "text",
      prompt: "What would you improve?",
      promptAr: "ما الذي تقترح تحسينه؟",
      required: false,
      maxLength: feedbackLimit,
    },
  ],
  recipient: [
    {
      id: "recipient_information_section",
      type: "section",
      title: "Service information",
      titleAr: "معلومات الخدمة",
      description: "Tell us about finding and understanding the service information you need.",
      descriptionAr: "أخبرنا عن مدى سهولة العثور على معلومات الخدمة التي تحتاجها وفهمها.",
    },
    {
      id: "recipient_information_clear",
      type: "choice",
      prompt: "Was the service information clear and easy to understand?",
      promptAr: "هل كانت معلومات الخدمة واضحة وسهلة الفهم؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "recipient_found_service",
      type: "choice",
      prompt: "Were you able to find the service information you needed?",
      promptAr: "هل تمكنت من العثور على معلومات الخدمة التي تحتاجها؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "recipient_information_complete",
      type: "choice",
      prompt: "Was the service information complete and up-to-date?",
      promptAr: "هل كانت معلومات الخدمة كاملة ومحدثة؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "recipient_experience_section",
      type: "section",
      title: "Overall satisfaction",
      titleAr: "الرضا العام",
      description: "Next, tell us how satisfied you are with the services catalogue.",
      descriptionAr: "أخبرنا الآن عن مدى رضاك عن دليل الخدمات.",
    },
    {
      id: "recipient_usage_frequency",
      type: "choice",
      prompt: "How often do you use the service?",
      promptAr: "كم مرة تستخدم الخدمة؟",
      required: true,
      options: frequencyOptions,
    },
    {
      id: "recipient_speed_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the speed of the service? Do you feel that it's much faster than a traditional service?",
      promptAr: "ما مدى رضاك عن سرعة الخدمة؟ وهل تشعر أنها أسرع بكثير من الخدمة التقليدية؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "recipient_accessibility_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the accessibility of the service? (e.g. for people with disabilities, or using mobile devices)",
      promptAr: "ما مدى رضاك عن سهولة الوصول إلى الخدمة (مثلًا للأشخاص ذوي الإعاقة أو مستخدمي الأجهزة المحمولة)؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "recipient_ui_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the user interface / visual design of the service?",
      promptAr: "ما مدى رضاك عن واجهة المستخدم / التصميم البصري للخدمة؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "recipient_overall_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the catalogue?",
      promptAr: "ما مدى رضاك عن الدليل؟",
      required: true,
      options: satisfactionOptions,
    },
    {
      id: "recipient_additional_feedback_section",
      type: "section",
      title: "Additional feedback",
      titleAr: "ملاحظات إضافية",
      description: "Share what would make your experience better.",
      descriptionAr: "شاركنا ما الذي يمكن أن يجعل تجربتك أفضل.",
    },
    {
      id: "recipient_additional_feedback",
      type: "text",
      prompt: "What would make your experience better?",
      promptAr: "ما الذي يمكن أن يجعل تجربتك أفضل؟",
      required: false,
      maxLength: feedbackLimit,
    },
  ],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function boundedText(value: unknown, maxLength: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length <= maxLength && (allowEmpty || text.length > 0) ? text : null;
}

function optionalText(value: unknown, maxLength: number): string | null {
  return value === undefined ? "" : boundedText(value, maxLength, true);
}

function parseQuestionList(value: unknown): FeedbackQuestion[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const ids = new Set<string>();
  const questions: FeedbackQuestion[] = [];

  for (const raw of value) {
    if (!isRecord(raw)) return null;
    const id = raw["id"];
    if (typeof id !== "string" || !/^[a-z0-9_-]{1,80}$/.test(id) || ids.has(id)) return null;
    ids.add(id);

    if (raw["type"] === "section") {
      const title = boundedText(raw["title"], 200);
      const titleAr = boundedText(raw["titleAr"], 200);
      const description = optionalText(raw["description"], 1000);
      const descriptionAr = optionalText(raw["descriptionAr"], 1000);
      if (!title || !titleAr || description === null || descriptionAr === null) return null;
      questions.push({
        id,
        type: "section",
        title,
        titleAr,
        ...(description ? { description } : {}),
        ...(descriptionAr ? { descriptionAr } : {}),
      });
      continue;
    }

    const prompt = boundedText(raw["prompt"], 500);
    const promptAr = boundedText(raw["promptAr"], 500);
    if (!prompt || !promptAr || typeof raw["required"] !== "boolean") return null;

    if (raw["type"] === "choice") {
      if (!Array.isArray(raw["options"]) || raw["options"].length < 2 || raw["options"].length > 20) return null;
      const optionValues = new Set<string>();
      const options: FeedbackChoice[] = [];
      for (const option of raw["options"]) {
        if (!isRecord(option)) return null;
        const optionValue = option["value"];
        const label = boundedText(option["label"], 200);
        const labelAr = boundedText(option["labelAr"], 200);
        if (
          typeof optionValue !== "string" ||
          !/^[a-z0-9_-]{1,80}$/.test(optionValue) ||
          optionValues.has(optionValue) ||
          !label ||
          !labelAr
        ) {
          return null;
        }
        optionValues.add(optionValue);
        options.push({ value: optionValue, label, labelAr });
      }
      questions.push({ id, type: "choice", prompt, promptAr, required: raw["required"], options });
      continue;
    }

    if (raw["type"] === "text") {
      const maxLength = raw["maxLength"];
      if (typeof maxLength !== "number" || !Number.isInteger(maxLength) || maxLength < 1 || maxLength > 4000) return null;
      questions.push({ id, type: "text", prompt, promptAr, required: raw["required"], maxLength });
      continue;
    }

    return null;
  }

  return questions.some((question) => question.type !== "section") ? questions : null;
}

/** Validate and normalize survey definitions received from the admin editor or database. */
export function parseFeedbackSurveyConfig(value: unknown): FeedbackSurveyConfig | null {
  if (!isRecord(value)) return null;
  const staff = parseQuestionList(value["staff"]);
  const recipient = parseQuestionList(value["recipient"]);
  return staff && recipient ? { staff, recipient } : null;
}
