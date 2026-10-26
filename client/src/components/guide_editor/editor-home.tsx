import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { useLanguage } from "@/components/settings/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, serviceTitle, type Dashboard, type LatestUpdate } from "@/lib/guide-api";
import { editorPaths, type EditorContext } from "./editor-layout";

/** Shown at /moh/editor: the dashboard for admins, a hint for staff before a service is chosen. */
export function EditorHome() {
  const { isAdmin } = useOutletContext<EditorContext>();
  const { isArabic } = useLanguage();
  if (isAdmin) return <AdminDashboard />;
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed px-6 text-center text-muted-foreground">
      {isArabic ? "اختر خدمة من القائمة لتحرير محتواها." : "Choose a service from the list to edit its content."}
    </div>
  );
}

const actionText: Record<string, { ar: string; en: string }> = {
  "service.create": { ar: "أضاف الخدمة", en: "added the service" },
  "service.rename": { ar: "غيّر اسم الخدمة", en: "renamed the service" },
  "service.delete": { ar: "حذف الخدمة", en: "deleted the service" },
  "service.move": { ar: "نقل الخدمة", en: "moved the service" },
  "section.save": { ar: "عدّل محتوى الخدمة", en: "edited the content of" },
  "flowchart.create": { ar: "أضاف مخططاً إلى الخدمة", en: "added a diagram to" },
  "flowchart.update": { ar: "عدّل مخططاً في الخدمة", en: "edited a diagram of" },
  "flowchart.delete": { ar: "حذف مخططاً من الخدمة", en: "deleted a diagram from" },
  "image.create": { ar: "أضاف صورة إلى الخدمة", en: "added a picture to" },
  "image.replace": { ar: "استبدل صورة في الخدمة", en: "replaced a picture of" },
  "image.update": { ar: "عدّل صورة في الخدمة", en: "edited a picture of" },
  "image.delete": { ar: "حذف صورة من الخدمة", en: "deleted a picture from" },
};

function AdminDashboard() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [data, setData] = useState<Dashboard | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    adminApi.dashboard().then(setData, () => setFailed(true));
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("لوحة التحكم", "Dashboard")}</h1>
      {failed && <p className="text-sm text-destructive">{t("تعذر تحميل لوحة التحكم.", "Unable to load the dashboard.")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>{t("إجمالي الخدمات", "Total services")}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{data ? data.totalServices.toLocaleString(isArabic ? "ar" : "en") : "…"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t("آخر تحديث على الخدمات", "Latest service update")}</CardDescription>
          </CardHeader>
          <CardContent>{data ? <LatestUpdateView update={data.latestUpdate} /> : <span className="text-muted-foreground">…</span>}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function LatestUpdateView({ update }: { update: LatestUpdate | null }) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  if (!update) return <p className="text-muted-foreground">{t("لا توجد تحديثات بعد.", "No updates yet.")}</p>;

  const action = actionText[update.action];
  const name = serviceTitle(update.serviceName);
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">
        {update.userName} {action ? (isArabic ? action.ar : action.en) : update.action}
      </p>
      <p className="font-medium">
        {update.serviceId ? (
          <Link to={editorPaths.service(update.serviceId)} className="underline-offset-2 hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
      </p>
      {update.detail && <p className="text-muted-foreground">{update.detail}</p>}
      <p className="text-xs text-muted-foreground">
        {[update.divisionName, new Date(update.createdAt).toLocaleString(isArabic ? "ar" : "en")].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
