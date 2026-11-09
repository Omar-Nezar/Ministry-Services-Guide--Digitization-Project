export type FeedbackRespondentType = "staff" | "recipient";

type FeedbackChoice = {
  value: string;
  label: string;
  labelAr: string;
};

type FeedbackQuestion =
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
  { value: "satisfied", label: "Satisfied", labelAr: "راضٍ" },
  { value: "somewhat_satisfied", label: "Somewhat satisfied", labelAr: "إلى حد ما راضٍ" },
  { value: "neutral", label: "Neutral", labelAr: "محايد" },
  { value: "somewhat_dissatisfied", label: "Somewhat dissatisfied", labelAr: "إلى حد ما غير راضٍ" },
  { value: "dissatisfied", label: "Dissatisfied", labelAr: "غير راضٍ" },
] as const;

const feedbackLimit = 4000;

// Edit each audience's questions here. Keep IDs stable for stored responses;
// this shared definition drives both the form and the server-side validation.
export const feedbackQuestions = {
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
      promptAr: "هل إجراءات الخدمات واضحة وسهلة التحديث؟",
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
      id: "staff_navigation_satisfaction",
      type: "choice",
      prompt: "How statisfied are you with the websites navigation?",
      promptAr: "هل تساعدك أدوات الدليل على إنجاز عملك بفاعلية؟",
      required: true,
      options: satisfactionOptions,
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
      id: "recipient_experience_section",
      type: "section",
      title: "Overall satisfaction",
      titleAr: "الرضا العام",
      description: "Next, tell us how satisfied you are with the services catalogue.",
      descriptionAr: "أخبرنا الآن عن مدى رضاك عن دليل الخدمات.",
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
} as const satisfies Record<FeedbackRespondentType, readonly FeedbackQuestion[]>;
