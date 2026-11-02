import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronLeft, ChevronRight, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorPick } from "@/components/ui/color-pick";
import { Input } from "@/components/ui/input";
import { Tip } from "@/components/ui/tip";
import { DEFAULT_LABEL_COLOR, apiErrorMessage, divisionTitle, editorApi, type LabelColor, type SectionLabel } from "@/lib/guide-api";
import { colors } from "@/styles/colors";
import type { EditorContext } from "./editor-layout";

const PRESETS = [
  colors.secondary_sea,
  colors.secondary_palm,
  colors.secondary_sand,
  colors.secondary_mountain,
  colors.secondary_water,
  colors.secondary_culture,
  colors.primary_gold,
  colors.primary_red,
];

/** The label library (admins) and the colour of the labels of each category. */
export function LabelsPage() {
  const { isAdmin } = useOutletContext<EditorContext>();
  const [labels, setLabels] = useState<SectionLabel[]>([]);

  useEffect(() => {
    void editorApi.labels().then(setLabels);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <LabelLibrary labels={labels} setLabels={setLabels} editable={isAdmin} />
      <CategoryColors labels={labels} />
    </div>
  );
}

function LabelLibrary({
  labels,
  setLabels,
  editable,
}: {
  labels: SectionLabel[];
  setLabels: (update: (labels: SectionLabel[]) => SectionLabel[]) => void;
  editable: boolean;
}) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [newName, setNewName] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const label = await editorApi.createLabel(name);
      setLabels((l) => [...l, label]);
      setNewName("");
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر إضافة العنوان.", "Unable to add the label.")));
    }
  };

  const rename = async (label: SectionLabel, name: string) => {
    setLabels((ls) => ls.map((l) => (l.id === label.id ? { ...l, name } : l)));
    try {
      await editorApi.renameLabel(label.id, name);
    } catch (e) {
      setLabels((ls) => ls.map((l) => (l.id === label.id ? label : l)));
      alert(apiErrorMessage(e, t("تعذر إعادة التسمية.", "Unable to rename the label.")));
    }
  };

  const remove = async (label: SectionLabel) => {
    if (
      !confirm(
        t(
          `حذف العنوان "${label.name}"؟ سيتم حذف النص المكتوب تحته في جميع الخدمات.`,
          `Delete the label "${label.name}"? The text written under it in every service is deleted too.`,
        ),
      )
    ) {
      return;
    }
    try {
      await editorApi.deleteLabel(label.id);
      setLabels((ls) => ls.filter((l) => l.id !== label.id));
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر الحذف.", "Unable to delete the label.")));
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      labels,
      labels.findIndex((l) => l.id === active.id),
      labels.findIndex((l) => l.id === over.id),
    );
    setLabels(() => next);
    void editorApi.reorderLabels(next.map((l) => l.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("مكتبة العناوين", "Label library")}</CardTitle>
        <CardDescription>
          {editable
            ? t(
                "عناوين مشتركة تُستخدم في جميع الخدمات. التعديل هنا يظهر في كل مكان. تُحدد ألوان العناوين لكل مجال من «ألوان المجالات» أدناه.",
                "The labels every service is written under. Changes show everywhere. Label colours are set per category below.",
              )
            : t("تعديل العناوين متاح لمدير النظام فقط.", "Only admins can change the labels.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {editable && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("اسم العنوان الجديد", "New label name")} aria-label={t("اسم العنوان الجديد", "New label name")} />
            <Button type="submit" disabled={!newName.trim()}>
              <Plus /> {t("إضافة", "Add")}
            </Button>
          </form>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={labels.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {labels.map((l) => (
                <LabelRow key={l.id} label={l} editable={editable} onRename={(name) => void rename(l, name)} onDelete={() => void remove(l)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {labels.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد عناوين بعد.", "No labels yet.")}</p>}
      </CardContent>
    </Card>
  );
}

function LabelRow({
  label,
  editable,
  onRename,
  onDelete,
}: {
  label: SectionLabel;
  editable: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { isArabic } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: label.id, disabled: !editable });
  const [name, setName] = useState(label.name);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-card p-2 ${isDragging ? "z-10 opacity-60 shadow-lg" : ""}`}
    >
      {editable && (
        <button type="button" className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground" aria-label={isArabic ? "سحب" : "Drag"} {...attributes} {...listeners}>
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <Input
        value={name}
        disabled={!editable}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== label.name && onRename(name.trim())}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label={isArabic ? "اسم العنوان" : "Label name"}
      />
      {editable && (
        <Tip label={isArabic ? "حذف" : "Delete"}>
          <Button type="button" size="icon" variant="ghost" className="hover:text-destructive" aria-label={isArabic ? "حذف" : "Delete"} onClick={onDelete}>
            <Trash2 />
          </Button>
        </Tip>
      )}
    </li>
  );
}

/**
 * Colour profile per category. Pick one colour and every label of that category uses it; open "customise"
 * to give single labels their own colour. Without a colour the labels use the ministry's blue.
 */
function CategoryColors({ labels }: { labels: SectionLabel[] }) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const { tree, setTree } = useOutletContext<EditorContext>();
  const [overrides, setOverrides] = useState<LabelColor[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const Collapsed = isArabic ? ChevronLeft : ChevronRight;

  useEffect(() => {
    void editorApi.labelColors().then(setOverrides);
  }, []);

  // Choices are kept here until "Save changes" is pressed; nothing is sent to the server before that.
  const [baseDraft, setBaseDraft] = useState<Record<number, string | null>>({});
  const [ovDraft, setOvDraft] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const key = (divisionId: number, labelId: number) => divisionId + ":" + labelId;
  const dirty = Object.keys(baseDraft).length + Object.keys(ovDraft).length > 0;

  const setBase = (divisionId: number, color: string | null) => setBaseDraft((d) => ({ ...d, [divisionId]: color }));
  const setOverride = (divisionId: number, labelId: number, color: string | null) =>
    setOvDraft((d) => ({ ...d, [key(divisionId, labelId)]: color }));

  /** The overrides as they will be after saving. */
  const effective = (divisionId: number): LabelColor[] => {
    const rows = overrides.filter((o) => o.serviceDivisionId === divisionId && !(key(divisionId, o.labelId) in ovDraft));
    for (const l of labels) {
      const c = ovDraft[key(divisionId, l.id)];
      if (c) rows.push({ serviceDivisionId: divisionId, labelId: l.id, color: c });
    }
    return rows;
  };

  const resetAll = (divisionId: number) =>
    setOvDraft((d) => {
      const next = { ...d };
      for (const l of labels) next[key(divisionId, l.id)] = null;
      return next;
    });

  const discard = () => {
    setBaseDraft({});
    setOvDraft({});
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const [id, color] of Object.entries(baseDraft)) await editorApi.setDivisionColor(Number(id), color);
      for (const [k, color] of Object.entries(ovDraft)) {
        const [d, l] = k.split(":").map(Number);
        await editorApi.setLabelColor(d, l, color);
      }
      setTree((ts) => ts.map((d) => (d.id in baseDraft ? { ...d, color: baseDraft[d.id] } : d)));
      setOverrides(await editorApi.labelColors());
      discard();
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر حفظ اللون.", "Unable to save the colour.")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("ألوان المجالات", "Category colours")}</CardTitle>
        <CardDescription>
          {t(
            "لكل مجال لوحة ألوان خاصة به. اختر لوناً واحداً لجميع عناوين المجال، ويمكنك تخصيص لون مختلف لكل عنوان عند الحاجة.",
            "Each category has its own colours. Pick one colour for all its labels, and give single labels a different colour if needed.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tree?.map((d) => {
          const mine = effective(d.id);
          const color = d.id in baseDraft ? baseDraft[d.id] : d.color;
          const isOpen = open === d.id;
          const base = color ?? DEFAULT_LABEL_COLOR;
          return (
            <div key={d.id} className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <span className="flex min-w-40 flex-1 items-center gap-2 font-semibold">
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: base }} />
                  {divisionTitle(d, isArabic)}
                </span>
                {d.editable ? (
                  <>
                    <div className="flex items-center gap-1">
                      {PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          aria-label={p}
                          onClick={() => setBase(d.id, p)}
                          style={{ background: p }}
                          className={`size-6 rounded-full border-2 ${color === p ? "border-foreground" : "border-transparent"}`}
                        />
                      ))}
                      <Tip label={t("لون مخصص", "Custom colour")}>
                        <ColorPick
                          aria-label={t("لون مخصص", "Custom colour")}
                          value={base}
                          onCommit={(c) => setBase(d.id, c)}
                          className="size-7 cursor-pointer rounded border bg-transparent p-0.5"
                        />
                      </Tip>
                    </div>
                    {color && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setBase(d.id, null)}>
                        {t("اللون الافتراضي", "Default colour")}
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(isOpen ? null : d.id)}>
                      {isOpen ? <ChevronDown /> : <Collapsed />} {t("تخصيص حسب العنوان", "Customise per label")}
                      {mine.length > 0 && ` (${mine.length})`}
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("للعرض فقط", "View only")}</span>
                )}
              </div>

              {isOpen && d.editable && (
                <div className="flex flex-col gap-1.5 border-t bg-muted/30 p-3">
                  {labels.map((l) => {
                    const own = mine.find((o) => o.labelId === l.id)?.color;
                    return (
                      <div key={l.id} className="flex items-center gap-2">
                        <ColorPick
                          aria-label={l.name}
                          value={own ?? base}
                          onCommit={(c) => setOverride(d.id, l.id, c)}
                          className="size-8 cursor-pointer rounded border bg-transparent p-0.5"
                        />
                        <span className="flex-1 text-sm">{l.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {own ? t("مخصص", "Custom") : color ? t("لون المجال", "Category colour") : t("الافتراضي", "Default")}
                        </span>
                        <Tip label={t("العودة للون المجال", "Back to the category colour")}>
                          <Button type="button" size="icon-sm" variant="ghost" aria-label={t("العودة للون المجال", "Back to the category colour")} disabled={!own} onClick={() => setOverride(d.id, l.id, null)}>
                            <RotateCcw />
                          </Button>
                        </Tip>
                      </div>
                    );
                  })}
                  {mine.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => resetAll(d.id)}>
                      {t("إزالة كل التخصيصات", "Remove all customisations")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!tree && <p className="text-sm text-muted-foreground">{t("جارٍ التحميل…", "Loading…")}</p>}
        {dirty && (
          <div className="sticky bottom-2 flex items-center justify-end gap-2 rounded-lg border bg-card p-2 shadow-md">
            <span className="me-auto text-xs text-muted-foreground">{t("تغييرات غير محفوظة", "Unsaved changes")}</span>
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={discard}>
              {t("تجاهل", "Discard")}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? t("جارٍ الحفظ…", "Saving…") : t("حفظ التغييرات", "Save changes")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
