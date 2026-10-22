import { useEffect, useState, type SubmitEvent } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { Link } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loginUser,
  logout,
} from "@/slices/auth.slice";
import type { AppDispatch, RootState } from "@/store/store";

const arabicLoginErrors: Record<string, string> = {
  "Unable to sign in. Please try again.": "تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.",
  "The server returned an unexpected response.": "أعاد الخادم استجابة غير متوقعة.",
  "Unable to reach the server. Check that the API is running.":
    "تعذر الاتصال بالخادم. تحقق من تشغيل واجهة برمجة التطبيقات.",
  "Invalid email or password.": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Provide a valid email and password.":
    "يرجى إدخال بريد إلكتروني صالح وكلمة مرور.",
  "Unable to log in right now.": "يتعذر تسجيل الدخول الآن.",
  "You are not assigned to the selected role.": "أنت غير معين لهذا الدور.",
  "You are not assigned to the selected department.": "أنت غير معين لهذا القسم.",
};

const roleLabels: Record<string, { en: string; ar: string }> = {
  admin: { en: "Administrator", ar: "مدير النظام" },
  staff: { en: "Staff Member", ar: "موظف" },
};

const divisionLabels: Record<string, { en: string; ar: string }> = {
  "Real Estate Registry": { en: "Real Estate Registry", ar: "سجل العقارات" },
  Lands: { en: "Lands", ar: "الأراضي" },
  "Social Housing and Projects": {
    en: "Social Housing and Projects",
    ar: "الإسكان الاجتماعي والمشاريع",
  },
  "Urban Planning": { en: "Urban Planning", ar: "التخطيط العمراني" },
  "Real Estate Development": {
    en: "Real Estate Development",
    ar: "التطوير العقاري",
  },
  "Real Estate Brokerage": {
    en: "Real Estate Brokerage",
    ar: "الوساطة العقارية",
  },
  "Client Services": { en: "Client Services", ar: "خدمة المراجعين" },
  IT: { en: "Information Technology", ar: "تكنولوجيا المعلومات" },
};

export function Login() {
  const { isArabic } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const status = useSelector((state: RootState) => state.auth.status);
  const error = useSelector((state: RootState) => state.auth.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"}/auth/options`,
        );
        const data = await res.json();
        if (Array.isArray(data.roles)) setAvailableRoles(data.roles);
        if (Array.isArray(data.serviceDivisions))
          setAvailableDivisions(data.serviceDivisions);
      } catch {
        setAvailableRoles(["admin", "staff"]);
        setAvailableDivisions([
          "Real Estate Registry",
          "Lands",
          "Social Housing and Projects",
          "Urban Planning",
          "Real Estate Development",
          "Real Estate Brokerage",
          "Client Services",
          "IT",
        ]);
      } finally {
        setOptionsLoading(false);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (!role && availableRoles.length > 0) setRole(availableRoles[0]);
    if (!department && availableDivisions.length > 0)
      setDepartment(availableDivisions[0]);
  }, [availableRoles, availableDivisions, role, department]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await dispatch(loginUser({ email, password, role, department }));
    if (loginUser.fulfilled.match(result)) {
      setPassword("");
    }
  }

  const labelFor = (
    map: Record<string, { en: string; ar: string }>,
    key: string,
  ) => {
    const entry = map[key];
    if (entry) return isArabic ? entry.ar : entry.en;
    return key;
  };

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-muted/40 px-4 py-12 text-foreground">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {isArabic ? "العودة إلى الرئيسية" : "Back to home"}
          </Link>

          <Card>
            <CardHeader className="items-center px-6 pt-8 text-center">
              <CardTitle className="text-2xl">
                {isArabic ? "تسجيل دخول الموظفين" : "Staff sign in"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "استخدم حساب الوزارة للمتابعة."
                  : "Use your ministry account to continue."}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-7">
              {user ? (
                <div className="space-y-5" aria-live="polite">
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="font-medium">
                      {isArabic
                        ? `تم تسجيل الدخول، ${user.name}.`
                        : `You’re signed in, ${user.name}.`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {user.roles.join(", ") ||
                        (isArabic ? "لم يتم تعيين دور" : "No role assigned")}
                      {user.departments.length > 0 &&
                        ` · ${user.departments.join(", ")}`}
                    </p>
                  </div>
                  <Link
                    to="/moh/editor"
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isArabic ? "فتح محرر دليل الخدمات" : "Open the services guide editor"}
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      dispatch(logout());
                      setEmail("");
                      setPassword("");
                    }}
                  >
                    <LogOut aria-hidden="true" />
                    {isArabic ? "تسجيل الخروج" : "Sign out"}
                  </Button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field className="space-y-2">
                      <FieldLabel
                        htmlFor="email"
                        className="text-sm font-medium leading-none"
                      >
                        {isArabic ? "البريد الإلكتروني" : "Email"}
                      </FieldLabel>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@ministry.gov"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                      />
                    </Field>

                    <Field className="space-y-2">
                      <FieldLabel
                        htmlFor="password"
                        className="text-sm font-medium leading-none"
                      >
                        {isArabic ? "كلمة المرور" : "Password"}
                      </FieldLabel>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                      />
                    </Field>

                    <Field className="space-y-2">
                      <FieldLabel
                        htmlFor="role"
                        className="text-sm font-medium leading-none"
                      >
                        {isArabic ? "الدور" : "Role"}
                      </FieldLabel>
                      <Select
                        id="role"
                        value={role}
                        onValueChange={setRole}
                        className="w-full"
                        disabled={optionsLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isArabic ? "اختر الدور" : "Select role"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectLabel>
                            {isArabic ? "الأدوار المتاحة" : "Available Roles"}
                          </SelectLabel>
                          {availableRoles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {labelFor(roleLabels, r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="space-y-2">
                      <FieldLabel
                        htmlFor="department"
                        className="text-sm font-medium leading-none"
                      >
                        {isArabic ? "القسم" : "Department"}
                      </FieldLabel>
                      <Select
                        id="department"
                        value={department}
                        onValueChange={setDepartment}
                        className="w-full"
                        disabled={optionsLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isArabic ? "اختر القسم" : "Select department"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectLabel>
                            {isArabic ? "الأقسام المتاحة" : "Available Departments"}
                          </SelectLabel>
                          {availableDivisions.map((d) => (
                            <SelectItem key={d} value={d}>
                              {labelFor(divisionLabels, d)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {error && (
                      <p
                        role="alert"
                        className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                      >
                        {isArabic
                          ? arabicLoginErrors[error] ?? error
                          : error}
                      </p>
                    )}
                  </FieldGroup>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={status === "loading" || optionsLoading}
                  >
                    {status === "loading"
                      ? isArabic
                        ? "جارٍ تسجيل الدخول…"
                        : "Signing in…"
                      : isArabic
                        ? "تسجيل الدخول"
                        : "Sign in"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {isArabic
              ? "لموظفي وزارة الإسكان المصرح لهم فقط"
              : "Authorized Ministry of Housing staff only"}
          </p>
        </div>
      </main>
    </>
  );
}