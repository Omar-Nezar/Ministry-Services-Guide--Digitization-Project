export type FeedbackRespondentType = "staff" | "recipient";

type FeedbackChoice = {
  value: string;
  label: string;
  labelAr: string;
};

type FeedbackQuestion =
  | {
      id: string;
      type: "choice";
      prompt: string;
      promptAr: string;
      required: true;
      options: readonly FeedbackChoice[];
    }
  | {
      id: string;
      type: "text";
      prompt: string;
      promptAr: string;
      required: false;
      maxLength: number;
    };

const yesNoOptions = [
  { value: "yes", label: "Yes", labelAr: "نعم" },
  { value: "partly", label: "Partly", labelAr: "إلى حد ما" },
  { value: "no", label: "No", labelAr: "لا" },
] as const;

const satisfactionOptions = [
  { value: "very_satisfied", label: "Very satisfied", labelAr: "راضٍ جدًا" },
  { value: "satisfied", label: "Satisfied", labelAr: "راضٍ" },
  { value: "not_satisfied", label: "Not satisfied", labelAr: "غير راضٍ" },
] as const;

const feedbackLimit = 4000;

// Edit each audience's questions here. Keep IDs stable for stored responses;
// this shared definition drives both the form and the server-side validation.
export const feedbackQuestions = {
  staff: [
    {
      id: "staff_workflow_clarity",
      type: "choice",
      prompt: "Are the service workflows clear and easy to maintain?",
      promptAr: "هل إجراءات الخدمات واضحة وسهلة التحديث؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "staff_tools_helpful",
      type: "choice",
      prompt: "Do the catalogue tools support your work effectively?",
      promptAr: "هل تساعدك أدوات الدليل على إنجاز عملك بفاعلية؟",
      required: true,
      options: yesNoOptions,
    },
    {
      id: "staff_overall_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the staff experience?",
      promptAr: "ما مدى رضاك عن تجربة الموظفين؟",
      required: true,
      options: satisfactionOptions,
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
      id: "recipient_overall_satisfaction",
      type: "choice",
      prompt: "How satisfied are you with the catalogue?",
      promptAr: "ما مدى رضاك عن الدليل؟",
      required: true,
      options: satisfactionOptions,
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
} as const satisfies Record<FeedbackRespondentType, readonly FeedbackQuestion[]>;
