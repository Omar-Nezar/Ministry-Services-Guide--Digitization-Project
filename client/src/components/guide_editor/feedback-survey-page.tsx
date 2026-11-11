import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import {
  parseFeedbackSurveyConfig,
  type FeedbackQuestion,
  type FeedbackRespondentType,
  type FeedbackSurveyConfig,
} from "@shared/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/settings/language-context";
import { adminApi, apiErrorMessage } from "@/lib/guide-api";
import { editorPaths, type EditorContext } from "./editor-layout";

const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textAreaClass = "min-h-20 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const respondentTypes: { value: FeedbackRespondentType; label: string; labelAr: string }[] = [
  { value: "staff", label: "Ministry staff", labelAr: "موظفو الوزارة" },
  { value: "recipient", label: "Service recipients", labelAr: "مستفيدو الخدمات" },
];

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function SurveyField({
  label,
  value,
  onChange,
  multiline = false,
  dir,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
  maxLength?: number;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {multiline ? (
        <textarea dir={dir} maxLength={maxLength} className={textAreaClass} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input dir={dir} maxLength={maxLength} className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function FeedbackSurveyPage() {
  const { isAdmin, setDirty } = useOutletContext<EditorContext>();
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [audience, setAudience] = useState<FeedbackRespondentType>("staff");
  const [survey, setSurvey] = useState<FeedbackSurveyConfig | undefined>();
  const [savedSurvey, setSavedSurvey] = useState<FeedbackSurveyConfig | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi.feedbackSurvey().then(
      (config) => {
        if (!active) return;
        setSurvey(config);
        setSavedSurvey(config);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const dirty = Boolean(survey && savedSurvey && JSON.stringify(survey) !== JSON.stringify(savedSurvey));
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  if (!isAdmin) return <Navigate to={editorPaths.home} replace />;

  const updateItems = (update: (items: FeedbackQuestion[]) => FeedbackQuestion[]) => {
    setSurvey((current) => current && ({ ...current, [audience]: update(current[audience]) }));
    setSaveError("");
    setSaved(false);
  };

  const updateItem = (id: string, update: (item: FeedbackQuestion) => FeedbackQuestion) => {
    updateItems((items) => items.map((item) => item.id === id ? update(item) : item));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    updateItems((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const reordered = [...items];
      [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
      return reordered;
    });
  };

  const moveOption = (questionId: string, index: number, direction: -1 | 1) => {
    updateItem(questionId, (item) => {
      if (item.type !== "choice") return item;
      const target = index + direction;
      if (target < 0 || target >= item.options.length) return item;
      const options = [...item.options];
      [options[index], options[target]] = [options[target]!, options[index]!];
      return { ...item, options };
    });
  };

  const addSection = () => updateItems((items) => [
    ...items,
    {
      id: createId("section"),
      type: "section",
      title: "New section",
      titleAr: "قسم جديد",
      description: "",
      descriptionAr: "",
    },
  ]);

  const addQuestion = () => updateItems((items) => [
    ...items,
    {
      id: createId("question"),
      type: "choice",
      prompt: "New question",
      promptAr: "سؤال جديد",
      required: true,
      options: [
        { value: createId("option"), label: "Option 1", labelAr: "الخيار 1" },
        { value: createId("option"), label: "Option 2", labelAr: "الخيار 2" },
      ],
    },
  ]);

  const changeType = (id: string, type: "choice" | "text") => {
    updateItem(id, (item) => {
      if (item.type === "section" || item.type === type) return item;
      if (type === "text") return { id: item.id, type, prompt: item.prompt, promptAr: item.promptAr, required: item.required, maxLength: 4000 };
      return {
        id: item.id,
        type,
        prompt: item.prompt,
        promptAr: item.promptAr,
        required: item.required,
        options: [
          { value: createId("option"), label: "Option 1", labelAr: "الخيار 1" },
          { value: createId("option"), label: "Option 2", labelAr: "الخيار 2" },
        ],
      };
    });
  };

  const save = async () => {
    if (!survey) return;
    const validSurvey = parseFeedbackSurveyConfig(survey);
    if (!validSurvey) {
      setSaveError(t(
        "تحقق من وجود سؤال واحد على الأقل، ومن تعبئة النصوص وإضافة خيارين على الأقل لكل سؤال اختياري.",
        "Add at least one question, complete the text fields, and provide at least two options for each choice question.",
      ));
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const result = await adminApi.saveFeedbackSurvey(validSurvey);
      setSurvey(result);
      setSavedSurvey(result);
      setSaved(true);
    } catch (error: unknown) {
      setSaveError(apiErrorMessage(error, t("تعذر حفظ الاستبيان.", "Unable to save the survey.")));
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (item: FeedbackQuestion) => {
    const label = item.type === "section" ? (isArabic ? item.titleAr : item.title) : (isArabic ? item.promptAr : item.prompt);
    if (!confirm(t(`حذف "${label}"؟`, `Delete "${label}"?`))) return;
    updateItems((items) => items.filter((candidate) => candidate.id !== item.id));
  };

  const items = survey?.[audience] ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("تحرير استبيان الملاحظات", "Edit feedback survey")}</CardTitle>
          <CardDescription>
            {t("عدّل أسئلة الموظفين والمستفيدين. تُحفظ التغييرات في قاعدة البيانات وتطبّق على الاستبيانات الجديدة.", "Edit the questions for staff and service recipients. Changes are saved to the database and apply to new survey submissions.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("فئة المستجيبين", "Respondent audience")}>
            {respondentTypes.map((option) => (
              <Button
                key={option.value}
                type="button"
                aria-pressed={audience === option.value}
                variant={audience === option.value ? "default" : "outline"}
                onClick={() => setAudience(option.value)}
              >
                {isArabic ? option.labelAr : option.label}
              </Button>
            ))}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("جارٍ تحميل الاستبيان…", "Loading survey…")}</p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-destructive">{t("تعذر تحميل إعدادات الاستبيان.", "Unable to load the survey configuration.")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {t(`${items.filter((item) => item.type !== "section").length} سؤال · ${items.filter((item) => item.type === "section").length} قسم`, `${items.filter((item) => item.type !== "section").length} questions · ${items.filter((item) => item.type === "section").length} sections`)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={items.length >= 100} onClick={addSection}>
                    <Plus aria-hidden="true" /> {t("إضافة قسم", "Add section")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={items.length >= 100} onClick={addQuestion}>
                    <Plus aria-hidden="true" /> {t("إضافة سؤال", "Add question")}
                  </Button>
                </div>
              </div>
              <ol className="space-y-3">
                {items.map((item, index) => (
                  <li key={item.id}>
                    <Card size="sm" className={item.type === "section" ? "border-primary/30 bg-primary/5" : ""}>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="pt-1 text-xs font-medium tabular-nums text-muted-foreground">{index + 1}</span>
                          <div className="min-w-0 flex-1 space-y-3">
                            {item.type === "section" ? (
                              <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <SurveyField label="Section title (English)" value={item.title} onChange={(title) => updateItem(item.id, (current) => current.type === "section" ? { ...current, title } : current)} maxLength={200} />
                                  <SurveyField label="عنوان القسم (العربية)" value={item.titleAr} onChange={(titleAr) => updateItem(item.id, (current) => current.type === "section" ? { ...current, titleAr } : current)} dir="rtl" maxLength={200} />
                                  <SurveyField label="Description (English)" value={item.description ?? ""} onChange={(description) => updateItem(item.id, (current) => current.type === "section" ? { ...current, description } : current)} multiline maxLength={1000} />
                                  <SurveyField label="وصف القسم (العربية)" value={item.descriptionAr ?? ""} onChange={(descriptionAr) => updateItem(item.id, (current) => current.type === "section" ? { ...current, descriptionAr } : current)} multiline dir="rtl" maxLength={1000} />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <SurveyField label="Question (English)" value={item.prompt} onChange={(prompt) => updateItem(item.id, (current) => current.type !== "section" ? { ...current, prompt } : current)} multiline maxLength={500} />
                                  <SurveyField label="السؤال (العربية)" value={item.promptAr} onChange={(promptAr) => updateItem(item.id, (current) => current.type !== "section" ? { ...current, promptAr } : current)} multiline dir="rtl" maxLength={500} />
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={item.required} onChange={(event) => updateItem(item.id, (current) => current.type !== "section" ? { ...current, required: event.target.checked } : current)} />
                                    {t("إجابة مطلوبة", "Required")}
                                  </label>
                                  <label className="flex items-center gap-2 text-sm">
                                    <span>{t("نوع السؤال", "Question type")}</span>
                                    <select className={fieldClass} value={item.type} onChange={(event) => changeType(item.id, event.target.value as "choice" | "text")}>
                                      <option value="choice">{t("اختيار", "Choice")}</option>
                                      <option value="text">{t("إجابة نصية", "Text response")}</option>
                                    </select>
                                  </label>
                                  {item.type === "text" && (
                                    <label className="flex items-center gap-2 text-sm">
                                      <span>{t("الحد الأقصى للأحرف", "Maximum characters")}</span>
                                      <input className={`${fieldClass} w-24`} type="number" min={1} max={4000} value={item.maxLength} onChange={(event) => {
                                        const maxLength = Number(event.target.value);
                                        updateItem(item.id, (current) => current.type === "text" ? { ...current, maxLength } : current);
                                      }} />
                                    </label>
                                  )}
                                </div>
                                {item.type === "choice" && (
                                  <div className="space-y-2 rounded-md border bg-background p-3">
                                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
                                      <span>{t("الخيار (English)", "Option (English)")}</span>
                                      <span>{t("الخيار (العربية)", "Option (Arabic)")}</span>
                                      <span className="sr-only">{t("إجراءات", "Actions")}</span>
                                    </div>
                                    {item.options.map((option, optionIndex) => (
                                      <div key={option.value} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                                        <input maxLength={200} className={fieldClass} aria-label={`Option ${optionIndex + 1} (English)`} value={option.label} onChange={(event) => updateItem(item.id, (current) => current.type === "choice" ? { ...current, options: current.options.map((entry) => entry.value === option.value ? { ...entry, label: event.target.value } : entry) } : current)} />
                                        <input maxLength={200} className={fieldClass} aria-label={`Option ${optionIndex + 1} (Arabic)`} dir="rtl" value={option.labelAr} onChange={(event) => updateItem(item.id, (current) => current.type === "choice" ? { ...current, options: current.options.map((entry) => entry.value === option.value ? { ...entry, labelAr: event.target.value } : entry) } : current)} />
                                        <div className="flex">
                                          <Button type="button" variant="ghost" size="icon" aria-label={t("تحريك الخيار لأعلى", "Move option up")} disabled={optionIndex === 0} onClick={() => moveOption(item.id, optionIndex, -1)}><ArrowUp aria-hidden="true" /></Button>
                                          <Button type="button" variant="ghost" size="icon" aria-label={t("تحريك الخيار لأسفل", "Move option down")} disabled={optionIndex === item.options.length - 1} onClick={() => moveOption(item.id, optionIndex, 1)}><ArrowDown aria-hidden="true" /></Button>
                                          <Button type="button" variant="ghost" size="icon" aria-label={t("حذف الخيار", "Delete option")} disabled={item.options.length <= 2} onClick={() => updateItem(item.id, (current) => current.type === "choice" ? { ...current, options: current.options.filter((entry) => entry.value !== option.value) } : current)}>
                                            <Trash2 aria-hidden="true" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    <Button type="button" size="sm" variant="outline" disabled={item.options.length >= 20} onClick={() => updateItem(item.id, (current) => current.type === "choice" ? { ...current, options: [...current.options, { value: createId("option"), label: `Option ${current.options.length + 1}`, labelAr: `الخيار ${current.options.length + 1}` }] } : current)}>
                                      <Plus aria-hidden="true" /> {t("إضافة خيار", "Add option")}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <Button type="button" variant="ghost" size="icon" aria-label={t("تحريك لأعلى", "Move up")} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUp aria-hidden="true" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label={t("تحريك لأسفل", "Move down")} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDown aria-hidden="true" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label={item.type === "section" ? t("حذف القسم", "Delete section") : t("حذف السؤال", "Delete question")} onClick={() => removeItem(item)}><Trash2 aria-hidden="true" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ol>
              {saveError && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{saveError}</p>}
              {saved && <p role="status" className="text-sm text-primary">{t("تم حفظ الاستبيان.", "Survey saved.")}</p>}
              <div className="flex justify-end border-t pt-4">
                <Button type="button" onClick={() => void save()} disabled={saving || loading || !dirty}>
                  <Save aria-hidden="true" />
                  {saving ? t("جارٍ الحفظ…", "Saving…") : t("حفظ التغييرات", "Save changes")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
