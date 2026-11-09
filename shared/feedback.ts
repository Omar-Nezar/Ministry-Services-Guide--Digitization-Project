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
} as const satisfies Record<FeedbackRespondentType, readonly FeedbackQuestion[]>;
