import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router";
import { ArrowDown, ArrowUp, Check, FileDown, ImagePlus, Loader2, Trash2, Workflow } from "lucide-react";
import { newDoc, normalize } from "@/components/flowchart/diagram";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tip } from "@/components/ui/tip";
import { apiErrorMessage, editorApi, type EditorFlowchart, type EditorService, type GuideImage } from "@/lib/guide-api";
import { DiagramEditor } from "./diagram-editor";
import { EntryRow } from "./entry-row";
import { downloadDocx } from "./export-docx";
import type { EditorContext } from "./editor-layout";
import { ImageEditor } from "./image-editor";

type SaveState = "idle" | "saving" | "saved";

/**
 * One service: its name, the text under every label, its flowcharts and pictures.
 *
 * Nothing typed here is stored until Save is pressed: the editors register their unsaved changes (`markDirty`)
 * and Save runs them. Adding, deleting, reordering and uploading are stored at once (deleting asks first).
 */
export function ServiceEditor() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const { serviceId } = useParams();
  const { setTree, setDirty } = useOutletContext<EditorContext>();
  const [service, setService] = useState<EditorService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  // Bumped by Discard: reloads the service and remounts every editor with the stored content
  const [version, setVersion] = useState(0);

  const pending = useRef(new Map<string, () => Promise<unknown>>());
  // The text of the labels edited since the service was loaded (the Word export reads it)
  const typed = useRef(new Map<string, string>());
  const [count, setCount] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const markDirty = useCallback((key: string, save: () => Promise<unknown>) => {
    pending.current.set(key, save);
    setCount(pending.current.size);
    setSaveState("idle");
  }, []);

  const forget = (key: string) => {
    pending.current.delete(key);
    setCount(pending.current.size);
  };

  useEffect(() => {
    let current = true;
    setError(null);
    pending.current.clear();
    typed.current.clear();
    setCount(0);
    editorApi
      .service(Number(serviceId))
      .then((s) => {
        if (!current) return;
        setService(s);
        setName(s.name);
      })
      .catch((e: unknown) => current && setError(apiErrorMessage(e, t("الخدمة غير موجودة.", "Service not found."))));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, version]);

  // Tell the layout (it warns before leaving) and the browser (it warns before closing the tab)
  useEffect(() => {
    setDirty(count > 0);
    if (count === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [count, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const save = async () => {
    if (pending.current.size === 0 || saveState === "saving") return;
    setSaveState("saving");
    let message = "";
    await Promise.all(
      [...pending.current].map(async ([key, run]) => {
        try {
          await run();
          // Text typed while this was saving is registered again under the same key: keep it
          if (pending.current.get(key) === run) pending.current.delete(key);
        } catch (e) {
          message = apiErrorMessage(e, t("تعذر حفظ التغييرات.", "Unable to save the changes."));
        }
      }),
    );
    setCount(pending.current.size);
    if (pending.current.size > 0) {
      setSaveState("idle");
      alert(message || t("لم تُحفظ بعض التغييرات.", "Some changes were not saved."));
    } else setSaveState("saved");
  };

  // Ctrl+S / Cmd+S
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) return <Message text={error} />;
  if (!service || service.id !== Number(serviceId)) return <Message text={t("جارٍ التحميل…", "Loading…")} />;

  const editable = service.editable;
  const patch = (changes: Partial<EditorService>) => setService((s) => (s ? { ...s, ...changes } : s));

  const discard = () => {
    if (!confirm(t("تجاهل كل التغييرات غير المحفوظة؟", "Discard all unsaved changes?"))) return;
    setVersion((v) => v + 1);
  };

  const changeName = (next: string) => {
    setName(next);
    const trimmed = next.trim();
    if (!trimmed) return;
    markDirty("name", async () => {
      await editorApi.renameService(service.id, trimmed);
      patch({ name: trimmed });
      setTree((tree) => tree.map((d) => ({ ...d, services: d.services.map((s) => (s.id === service.id ? { ...s, name: trimmed } : s)) })));
    });
  };

  // Flowcharts
  const addFlowchart = async () => {
    const created = await editorApi.createFlowchart(service.id, "", JSON.stringify(normalize(newDoc(""))));
    patch({ flowcharts: [...service.flowcharts, created] });
  };
  const deleteFlowchart = async (f: EditorFlowchart) => {
    if (!confirm(t("حذف هذا المخطط نهائياً؟", "Delete this flowchart for good?"))) return;
    await editorApi.deleteFlowchart(f.id);
    forget(`flowchart-${f.id}`);
    patch({ flowcharts: service.flowcharts.filter((x) => x.id !== f.id) });
  };
  const moveFlowchart = (index: number, dir: -1 | 1) => {
    const next = move(service.flowcharts, index, dir);
    if (!next) return;
    patch({ flowcharts: next });
    void editorApi.reorderFlowcharts(service.id, next.map((f) => f.id));
  };

  // Pictures
  const addImage = async (file?: File) => {
    if (!file) return;
    try {
      patch({ images: [...service.images, await editorApi.uploadImage(service.id, file)] });
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر رفع الصورة.", "Unable to upload the picture.")));
    }
  };
  const deleteImage = async (image: GuideImage) => {
    if (!confirm(t("حذف هذه الصورة نهائياً؟", "Delete this picture for good?"))) return;
    await editorApi.deleteImage(image.id);
    forget(`image-${image.id}`);
    patch({ images: service.images.filter((x) => x.id !== image.id) });
  };
  const moveImage = (index: number, dir: -1 | 1) => {
    const next = move(service.images, index, dir);
    if (!next) return;
    patch({ images: next });
    void editorApi.reorderImages(service.id, next.map((i) => i.id));
  };

  const keyOf = (id: string | number) => `${service.id}-${version}-${id}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="sticky top-0 z-20 -mx-2 flex flex-wrap items-center gap-3 border-b bg-background/90 px-2 py-2 backdrop-blur">
        <p className="text-sm font-medium text-muted-foreground">
          {isArabic ? (service.serviceDivision.nameAr ?? service.serviceDivision.name) : service.serviceDivision.name}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ms-auto"
          onClick={() => void downloadDocx(name.trim() || service.name, service.labels.map((l) => ({ ...l, html: typed.current.get(l.key) ?? l.html })))}
        >
          <FileDown /> {t("تصدير Word", "Export Word")}
        </Button>
        {editable && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {saveState === "saving" ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> {t("جارٍ الحفظ…", "Saving…")}
                </span>
              ) : count > 0 ? (
                t("لديك تغييرات غير محفوظة", "You have unsaved changes")
              ) : saveState === "saved" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" /> {t("تم الحفظ", "All changes saved")}
                </span>
              ) : null}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={count === 0 || saveState === "saving"} onClick={discard}>
              {t("تجاهل", "Discard")}
            </Button>
            <Button type="button" size="sm" disabled={count === 0 || saveState === "saving"} onClick={() => void save()}>
              {t("حفظ التغييرات", "Save changes")}
              {count > 0 && ` (${count})`}
            </Button>
          </div>
        )}
      </div>

      {!editable && (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("هذه الخدمة تتبع مجالاً آخر، لذلك يمكنك عرضها فقط.", "This service belongs to another category, so you can only view it.")}
        </p>
      )}

      <section className="flex flex-col gap-4" dir="rtl">
        <Textarea
          rows={1}
          value={name}
          onChange={(e) => changeName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          disabled={!editable}
          placeholder={t("اسم الخدمة", "Service name")}
          aria-label={t("اسم الخدمة", "Service name")}
          className="min-h-0 resize-none rounded-none border-0 border-b bg-transparent px-1 py-2 text-2xl leading-relaxed font-bold shadow-none focus-visible:ring-0 md:text-2xl dark:bg-transparent"
          style={{ color: service.serviceDivision.color ?? undefined }}
        />
        <div className="flex flex-col gap-1.5">
          {service.labels.map((label) => (
            <EntryRow
              key={keyOf(label.key)}
              serviceId={service.id}
              label={label}
              disabled={!editable}
              onDirty={markDirty}
              onText={(key, html) => typed.current.set(key, html)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-primary">{t("مخططات سير الإجراء", "Procedure flowcharts")}</h2>
        {service.flowcharts.map((f, i) => (
          <div key={keyOf(`f${f.id}`)} className="flex flex-col gap-2">
            {editable && (
              <ItemActions
                index={i}
                count={service.flowcharts.length}
                onMove={(dir) => moveFlowchart(i, dir)}
                onDelete={() => void deleteFlowchart(f)}
                deleteLabel={t("حذف المخطط", "Delete flowchart")}
              />
            )}
            <DiagramEditor flowchart={f} onDirty={markDirty} />
          </div>
        ))}
        {service.flowcharts.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد مخططات.", "No flowcharts yet.")}</p>}
        {editable && (
          <Button type="button" variant="outline" className="w-fit border-dashed" onClick={() => void addFlowchart()}>
            <Workflow /> {t("إضافة مخطط", "Add a flowchart")}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-primary">{t("الصور", "Pictures")}</h2>
        {service.images.map((image, i) => (
          <div key={keyOf(`i${image.id}`)} className="flex flex-col gap-2">
            {editable && (
              <ItemActions
                index={i}
                count={service.images.length}
                onMove={(dir) => moveImage(i, dir)}
                onDelete={() => void deleteImage(image)}
                deleteLabel={t("حذف الصورة", "Delete picture")}
              />
            )}
            <ImageEditor
              image={image}
              onDirty={markDirty}
              onChange={(updated) => patch({ images: service.images.map((x) => (x.id === updated.id ? updated : x)) })}
            />
          </div>
        ))}
        {service.images.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد صور.", "No pictures yet.")}</p>}
        {editable && (
          <Button render={<label className="cursor-pointer" />} nativeButton={false} variant="outline" className="w-fit border-dashed">
            <ImagePlus /> {t("إضافة صورة", "Add a picture")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              onChange={(e) => {
                void addImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Button>
        )}
      </section>
    </div>
  );
}

/** The list with item `index` swapped one place, or null at the ends. */
function move<T>(list: T[], index: number, dir: -1 | 1): T[] | null {
  const to = index + dir;
  if (to < 0 || to >= list.length) return null;
  const next = [...list];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}

function ItemActions({
  index,
  count,
  onMove,
  onDelete,
  deleteLabel,
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  const { isArabic } = useLanguage();
  return (
    <div className="flex items-center gap-1">
      <span className="ms-auto" />
      <Tip label={isArabic ? "نقل لأعلى" : "Move up"}>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={isArabic ? "نقل لأعلى" : "Move up"} disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp />
        </Button>
      </Tip>
      <Tip label={isArabic ? "نقل لأسفل" : "Move down"}>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={isArabic ? "نقل لأسفل" : "Move down"} disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown />
        </Button>
      </Tip>
      <Tip label={deleteLabel}>
        <Button type="button" size="icon-sm" variant="ghost" className="hover:text-destructive" aria-label={deleteLabel} onClick={onDelete}>
          <Trash2 />
        </Button>
      </Tip>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground">{text}</div>;
}
