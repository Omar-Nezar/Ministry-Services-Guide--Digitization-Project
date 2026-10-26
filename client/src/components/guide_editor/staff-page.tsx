import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router";
import { Trash2, UserCheck, UserX } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, apiErrorMessage, divisionTitle, type StaffMember } from "@/lib/guide-api";
import { editorPaths, type EditorContext } from "./editor-layout";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Staff accounts (admins): move to another category, disable, remove. Accounts themselves are added in the database. */
export function StaffPage() {
  const { isAdmin, tree } = useOutletContext<EditorContext>();
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [staff, setStaff] = useState<StaffMember[] | undefined>();
  useEffect(() => {
    if (isAdmin) adminApi.staff().then(setStaff, () => setStaff([]));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to={editorPaths.home} replace />;

  const fail = (e: unknown, fallback: string) => alert(apiErrorMessage(e, fallback));
  const replace = (member: StaffMember) => setStaff((list) => list?.map((m) => (m.id === member.id ? member : m)));

  const toggle = async (m: StaffMember) => {
    try {
      replace(await adminApi.updateStaff(m.id, { isActive: !m.isActive }));
    } catch (e) {
      fail(e, t("تعذر تحديث الحساب.", "Unable to update the account."));
    }
  };

  const move = async (m: StaffMember, id: number) => {
    try {
      replace(await adminApi.updateStaff(m.id, { divisionId: id }));
    } catch (e) {
      fail(e, t("تعذر تغيير الشعبة.", "Unable to change the category."));
    }
  };

  const remove = async (m: StaffMember) => {
    if (!confirm(t(`حذف حساب ${m.name} نهائياً؟ يمكنك تعطيله بدلاً من ذلك.`, `Remove ${m.name}'s account for good? You can disable it instead.`))) return;
    try {
      await adminApi.deleteStaff(m.id);
      setStaff((list) => list?.filter((x) => x.id !== m.id));
    } catch (e) {
      fail(e, t("تعذر حذف الحساب.", "Unable to remove the account."));
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("الموظفون", "Staff")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {staff === undefined && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
          {staff?.length === 0 && <p className="text-muted-foreground">{t("لا يوجد موظفون بعد.", "No staff yet.")}</p>}
          {staff?.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name}
                  {!m.isActive && <span className="ms-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">{t("معطل", "Disabled")}</span>}
                </p>
                <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">{m.email}</p>
              </div>
              <select
                className={`${selectClass} sm:w-52`}
                aria-label={t("الشعبة", "Category")}
                value={m.divisions[0]?.id ?? ""}
                onChange={(e) => void move(m, Number(e.target.value))}
              >
                {!m.divisions[0] && <option value="">—</option>}
                {tree?.map((d) => (
                  <option key={d.id} value={d.id}>{divisionTitle(d, isArabic)}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => void toggle(m)}>
                  {m.isActive ? <UserX aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
                  {m.isActive ? t("تعطيل", "Disable") : t("تفعيل", "Enable")}
                </Button>
                <Button type="button" variant="outline" size="sm" aria-label={t("حذف", "Remove")} onClick={() => void remove(m)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
