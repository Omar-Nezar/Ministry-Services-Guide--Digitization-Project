import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, apiErrorMessage, divisionTitle, guideApi, uploadUrl, type PdfPage } from "@/lib/guide-api";
import { editorPaths, type EditorContext } from "./editor-layout";

type Where = { slot: PdfPage["slot"]; serviceDivisionId?: number };

const selectClass = "h-8 rounded-md border bg-card px-2 text-sm";

/** The pictures added to the exported PDF, as full A4 or A3 pages. Admins only. */
export function PdfPagesPage() {
  const { isAdmin, tree } = useOutletContext<EditorContext>();
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [size, setSize] = useState<PdfPage["size"]>("A4");
  const [orientation, setOrientation] = useState<PdfPage["orientation"]>("portrait");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    void guideApi.pdfPages().then(setPages);
  }, []);

  if (!isAdmin) return <Navigate to={editorPaths.home} replace />;

  const key = (w: Where) => `${w.slot}-${w.serviceDivisionId ?? ""}`;
  const inSlot = (w: Where) => pages.filter((p) => p.slot === w.slot && (p.serviceDivisionId ?? undefined) === w.serviceDivisionId);

  /** A picture becomes one page; a PDF becomes one page per PDF page, each at its own size. */
  const add = async (w: Where, files: File[]) => {
    if (files.length === 0) return;
    setBusy(key(w));
    try {
      for (const file of files) {
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const { pdfPagesAsImages } = await import("@/lib/pdf-to-images");
          for await (const page of pdfPagesAsImages(file)) {
            setProgress(`${page.index}/${page.total}`);
            const created = await adminApi.addPdfPage(page.file, w, page.size, page.orientation);
            setPages((ps) => [...ps, created]);
          }
        } else {
          const created = await adminApi.addPdfPage(file, w, size, orientation);
          setPages((ps) => [...ps, created]);
        }
      }
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر رفع الملف أو قراءته.", "Unable to read or upload the file.")));
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  const change = async (page: PdfPage, data: Partial<Pick<PdfPage, "size" | "orientation" | "imageFit">>) => {
    setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, ...data } : p)));
    try {
      await adminApi.updatePdfPage(page.id, data);
    } catch (e) {
      setPages((ps) => ps.map((p) => (p.id === page.id ? page : p)));
      alert(apiErrorMessage(e, t("تعذر الحفظ.", "Unable to save.")));
    }
  };

  const remove = async (page: PdfPage) => {
    if (!confirm(t("حذف هذه الصفحة من ملف PDF؟", "Remove this page from the PDF?"))) return;
    try {
      await adminApi.deletePdfPage(page.id);
      setPages((ps) => ps.filter((p) => p.id !== page.id));
    } catch (e) {
      alert(apiErrorMessage(e, t("تعذر الحذف.", "Unable to delete.")));
    }
  };

  const move = (w: Where, index: number, by: -1 | 1) => {
    const list = inSlot(w);
    const target = index + by;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPages((ps) => [...ps.filter((p) => !list.includes(p)), ...next.map((p, order) => ({ ...p, order }))]);
    void adminApi.reorderPdfPages(next.map((p) => p.id));
  };

  const slot = (w: Where, title: string) => {
    const list = inSlot(w);
    return (
      <section key={key(w)} className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">{title}</h3>
          <Button render={<label className="cursor-pointer" />} nativeButton={false} variant="outline" size="sm" disabled={busy === key(w)}>
            <Plus /> {busy === key(w) ? `${t("جارٍ الرفع…", "Uploading…")} ${progress}` : t("إضافة صورة أو PDF", "Add picture or PDF")}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
              className="sr-only"
              onChange={(e) => {
                void add(w, Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </Button>
        </div>
        {list.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد صفحات.", "No pages.")}</p>}
        <ul className="flex flex-col gap-2">
          {list.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-2">
              <img src={uploadUrl(p.imagePath)} alt="" className="h-20 w-16 shrink-0 rounded border bg-muted object-contain" />
              <select className={selectClass} value={p.size} aria-label={t("الحجم", "Size")} onChange={(e) => void change(p, { size: e.target.value as PdfPage["size"] })}>
                <option value="A4">A4</option>
                <option value="A3">A3</option>
              </select>
              <select className={selectClass} value={p.orientation} aria-label={t("الاتجاه", "Orientation")} onChange={(e) => void change(p, { orientation: e.target.value as PdfPage["orientation"] })}>
                <option value="portrait">{t("طولي", "Portrait")}</option>
                <option value="landscape">{t("عرضي", "Landscape")}</option>
              </select>
              <select className={selectClass} value={p.imageFit} aria-label={t("طريقة العرض", "Fit")} onChange={(e) => void change(p, { imageFit: e.target.value as PdfPage["imageFit"] })}>
                <option value="contain">{t("احتواء", "Contain")}</option>
                <option value="cover">{t("تغطية", "Cover")}</option>
              </select>
              <div className="ms-auto flex gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={t("أعلى", "Move up")} disabled={i === 0} onClick={() => move(w, i, -1)}>
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={t("أسفل", "Move down")} disabled={i === list.length - 1} onClick={() => move(w, i, 1)}>
                  <ArrowDown />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={t("حذف", "Delete")} onClick={() => void remove(p)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("صفحات ملف PDF", "PDF pages")}</CardTitle>
          <CardDescription>
            {t(
              "أضف صفحات كاملة (صور أو ملفات PDF) إلى الدليل المصدَّر بحجم A4 أو A3. تُقسَّم ملفات PDF إلى صفحات بحجمها الأصلي. تتبع المجالات ترتيبها في الدليل. عند الحفظ كملف PDF من نافذة الطباعة تحافظ كل صفحة على حجمها.",
              "Add full-page pictures or PDFs to the exported guide, as A4 or A3. A PDF is split into pages, each keeping its own size. Categories follow the order of the guide. Save as PDF from the print dialog keeps each page at its own size.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          {t("حجم الصورة الجديدة:", "New picture:")}
          <select className={selectClass} value={size} aria-label={t("الحجم", "Size")} onChange={(e) => setSize(e.target.value as PdfPage["size"])}>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
          </select>
          <select className={selectClass} value={orientation} aria-label={t("الاتجاه", "Orientation")} onChange={(e) => setOrientation(e.target.value as PdfPage["orientation"])}>
            <option value="portrait">{t("طولي", "Portrait")}</option>
            <option value="landscape">{t("عرضي", "Landscape")}</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("صفحات إضافية", "Extra pages")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {slot({ slot: "start" }, t("بداية الدليل (قبل الغلاف)", "Start of the guide (before the cover)"))}
          {(tree ?? []).flatMap((d) => [
            slot({ slot: "before", serviceDivisionId: d.id }, t(`قبل: ${divisionTitle(d, true)}`, `Before: ${divisionTitle(d, false)}`)),
            slot({ slot: "after", serviceDivisionId: d.id }, t(`بعد: ${divisionTitle(d, true)}`, `After: ${divisionTitle(d, false)}`)),
          ])}
          {slot({ slot: "end" }, t("نهاية الدليل", "End of the guide"))}
        </CardContent>
      </Card>
    </div>
  );
}
