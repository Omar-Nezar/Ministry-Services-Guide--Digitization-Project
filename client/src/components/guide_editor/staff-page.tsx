import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router";
import { Check, Copy, Pencil, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, apiErrorMessage, divisionTitle, type StaffMember } from "@/lib/guide-api";
import { editorPaths, type EditorContext } from "./editor-layout";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Titled = { id: number; name: string; nameAr: string | null };

/** One checkbox per category: the staff member can edit every ticked one. */
function CategoryPicker({ tree, value, onChange }: { tree: Titled[]; value: number[]; onChange: (ids: number[]) => void }) {
  const { isArabic } = useLanguage();
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {tree.map((d) => (
        <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.includes(d.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, d.id] : value.filter((id) => id !== d.id))}
          />
          {divisionTitle(d, isArabic)}
        </label>
      ))}
    </div>
  );
}

/** Staff accounts (admins): add (with a temporary password), set their categories, disable, remove. */
export function StaffPage() {
  const { isAdmin, tree } = useOutletContext<EditorContext>();
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [staff, setStaff] = useState<StaffMember[] | undefined>();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", divisionIds: [] as number[] });
  /** The account just created: its temporary password is shown once */
  const [created, setCreated] = useState<{ email: string; password: string } | undefined>();
  const [copied, setCopied] = useState(false);
  /** The staff member whose categories are being edited, and the ticked ones */
  const [editing, setEditing] = useState<{ id: number; divisionIds: number[] } | undefined>();
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

  const saveCategories = async (m: StaffMember, divisionIds: number[]) => {
    try {
      replace(await adminApi.updateStaff(m.id, { divisionIds }));
      setEditing(undefined);
    } catch (e) {
      fail(e, t("تعذر تغيير الشعب.", "Unable to change the categories."));
    }
  };

  const add = async () => {
    try {
      const { temporaryPassword, ...member } = await adminApi.createStaff(form);
      setStaff((list) => (list ? [...list, member].sort((a, b) => a.name.localeCompare(b.name)) : [member]));
      setCreated({ email: member.email, password: temporaryPassword });
      setCopied(false);
      setForm({ name: "", email: "", divisionIds: [] });
      setAdding(false);
    } catch (e) {
      fail(e, t("تعذر إضافة الحساب.", "Unable to add the account."));
    }
  };

  const copyPassword = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
    } catch {
      // The password stays visible to copy by hand
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
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{t("الموظفون", "Staff")}</CardTitle>
          <Button type="button" size="sm" onClick={() => setAdding((v) => !v)}>
            <UserPlus aria-hidden="true" />
            {t("إضافة موظف", "Add staff")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {created && (
            <div role="status" className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p>
                {t(
                  "تم إنشاء الحساب. سلّم كلمة المرور المؤقتة إلى الموظف؛ تظهر مرة واحدة فقط، وسيختار كلمة مرور خاصة به عند أول دخول.",
                  "Account created. Give the temporary password to the staff member. It is shown only once, and they choose their own at first sign-in."
                )}
              </p>
              <div dir="ltr" className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{created.email}</span>
                <code className="rounded bg-background px-2 py-1 font-mono">{created.password}</code>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyPassword()}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? t("تم النسخ", "Copied") : t("نسخ", "Copy")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreated(undefined)}>
                  {t("إخفاء", "Hide")}
                </Button>
              </div>
            </div>
          )}
          {adding && (
            <form
              className="space-y-3 rounded-lg border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={inputClass} required placeholder={t("الاسم", "Name")} aria-label={t("الاسم", "Name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className={inputClass} required type="email" dir="ltr" placeholder="name@ministry.gov" aria-label={t("البريد الإلكتروني", "Email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <p className="text-sm font-medium">{t("الشعب التي يمكنه تحريرها", "Categories they can edit")}</p>
              <CategoryPicker tree={tree ?? []} value={form.divisionIds} onChange={(divisionIds) => setForm({ ...form, divisionIds })} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={form.divisionIds.length === 0}>{t("إنشاء الحساب", "Create account")}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>{t("إلغاء", "Cancel")}</Button>
              </div>
            </form>
          )}
          {staff === undefined && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
          {staff?.length === 0 && <p className="text-muted-foreground">{t("لا يوجد موظفون بعد.", "No staff yet.")}</p>}
          {staff?.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name}
                  {!m.isActive && <span className="ms-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">{t("معطل", "Disabled")}</span>}
                  {m.mustChangePassword && <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t("لم يسجل الدخول بعد", "Not signed in yet")}</span>}
                </p>
                <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex flex-wrap gap-1 sm:max-w-xs">
                {m.divisions.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                {m.divisions.map((d) => (
                  <span key={d.id} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{divisionTitle(d, isArabic)}</span>
                ))}
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" aria-label={t("تعديل الشعب", "Edit categories")} onClick={() => setEditing({ id: m.id, divisionIds: m.divisions.map((d) => d.id) })}>
                  <Pencil aria-hidden="true" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void toggle(m)}>
                  {m.isActive ? <UserX aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
                  {m.isActive ? t("تعطيل", "Disable") : t("تفعيل", "Enable")}
                </Button>
                <Button type="button" variant="outline" size="sm" aria-label={t("حذف", "Remove")} onClick={() => void remove(m)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {editing?.id === m.id && (
                <div className="w-full space-y-3 border-t pt-3">
                  <CategoryPicker tree={tree ?? []} value={editing.divisionIds} onChange={(divisionIds) => setEditing({ id: m.id, divisionIds })} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={editing.divisionIds.length === 0} onClick={() => void saveCategories(m, editing.divisionIds)}>{t("حفظ", "Save")}</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(undefined)}>{t("إلغاء", "Cancel")}</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
