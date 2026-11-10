import { useState, type SubmitEvent } from "react";
import { ArrowLeft, ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import moh_logo_mini_NBG from "@/assets/moh_logo_mini_NBG.png";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { loginUser, logoutUser, setNewPassword } from "@/slices/auth.slice";
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
  "This account is disabled. Contact an administrator.":
    "هذا الحساب معطل. تواصل مع مدير النظام.",
  "Choose a password different from the current one.": "اختر كلمة مرور مختلفة عن الحالية.",
  "Unable to change the password right now.": "تعذر تغيير كلمة المرور الآن.",
  "Unable to sign out. Please try again.": "تعذر تسجيل الخروج. يرجى المحاولة مرة أخرى.",
  "Invalid CSRF token.": "تعذر إكمال تسجيل الخروج. يرجى إعادة المحاولة.",
};

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition duration-200 placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/15";
const MIN_PASSWORD_LENGTH = 8;

/** First sign-in of an account an admin created: the person replaces the temporary password with their own. */
function SetPasswordForm() {
  const { isArabic } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((state: RootState) => state.auth.status);
  const serverError = useSelector((state: RootState) => state.auth.error);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMismatch(password !== confirm);
    if (password !== confirm) return;
    await dispatch(setNewPassword({ newPassword: password }));
  }

  const error = mismatch
    ? isArabic ? "كلمتا المرور غير متطابقتين." : "The passwords do not match."
    : serverError
      ? isArabic ? arabicLoginErrors[serverError] ?? serverError : serverError
      : null;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        {isArabic
          ? "هذا أول تسجيل دخول لك. اختر كلمة مرور خاصة بك للمتابعة."
          : "This is your first sign-in. Choose your own password to continue."}
      </p>
      <FieldGroup>
        <Field className="space-y-2">
          <FieldLabel htmlFor="new-password" className="text-sm font-medium leading-none">
            {isArabic ? "كلمة المرور الجديدة" : "New password"}
          </FieldLabel>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            {isArabic ? `${MIN_PASSWORD_LENGTH} أحرف على الأقل.` : `At least ${MIN_PASSWORD_LENGTH} characters.`}
          </p>
        </Field>
        <Field className="space-y-2">
          <FieldLabel htmlFor="confirm-password" className="text-sm font-medium leading-none">
            {isArabic ? "تأكيد كلمة المرور" : "Confirm password"}
          </FieldLabel>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={inputClass}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </FieldGroup>
      <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={status === "loading"}>
        {isArabic ? "حفظ كلمة المرور" : "Save password"}
      </Button>
    </form>
  );
}

export function Login() {
  const { isArabic } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const status = useSelector((state: RootState) => state.auth.status);
  const error = useSelector((state: RootState) => state.auth.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    // The server decides the role and the divisions of the account
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) setPassword("");
  }

  async function handleLogout() {
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      setEmail("");
      setPassword("");
    }
  }

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const authorizedNote = isArabic ? "لموظفي وزارة الإسكان المصرح لهم فقط" : "Authorized Ministry of Housing staff only";

  return (
    <>
      <Header />
      <main className="relative isolate flex min-h-[calc(100dvh-var(--header-h)-5.5rem)] items-center justify-center px-4 py-12 text-foreground sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[30rem] text-secondary-accent [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,black,transparent)]"
        >
          <div className="pattern-khatam absolute inset-0 opacity-[0.06]" />
        </div>

        <div className="enter w-full max-w-4xl">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BackIcon aria-hidden="true" className="size-4" />
            {isArabic ? "العودة إلى الرئيسية" : "Back to home"}
          </Link>

          <div className="grid overflow-hidden rounded-3xl border bg-card shadow-lift md:grid-cols-[0.9fr_1fr]">
            {/* Ministry panel */}
            <aside className="relative isolate hidden flex-col justify-between gap-10 bg-secondary-accent p-9 text-secondary-accent-foreground md:flex">
              <div aria-hidden="true" className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_top,black,transparent_80%)]">
                <div className="pattern-khatam absolute inset-0 opacity-[0.12]" />
              </div>
              <img src={moh_logo_mini_NBG} alt="" aria-hidden="true" className="size-16 object-contain drop-shadow" />
              <div>
                <p className="text-sm text-secondary-accent-foreground/75">
                  {isArabic ? "وزارة الإسكان والتخطيط العمراني" : "Ministry of Housing and Urban Planning"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {isArabic ? "بوابة موظفي الوزارة" : "Ministry staff portal"}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-secondary-accent-foreground/80">
                  {isArabic
                    ? "سجل الدخول للوصول إلى مساحة عمل موظفي وزارة الإسكان."
                    : "Sign in to access the Ministry of Housing staff workspace."}
                </p>
              </div>
              <p className="flex items-center gap-2 text-xs text-secondary-accent-foreground/75">
                <ShieldCheck aria-hidden="true" className="size-4 text-brand-gold" />
                {authorizedNote}
              </p>
            </aside>

            {/* Form */}
            <div className="p-6 sm:p-10">
              <div className="mb-7">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {isArabic ? "تسجيل دخول الموظفين" : "Staff sign in"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isArabic ? "استخدم حساب الوزارة للمتابعة." : "Use your ministry account to continue."}
                </p>
              </div>

              {user?.mustChangePassword ? (
                <SetPasswordForm />
              ) : user ? (
                <div className="space-y-5" aria-live="polite">
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="font-medium">
                      {isArabic ? `تم تسجيل الدخول، ${user.name}.` : `You’re signed in, ${user.name}.`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {isArabic ? "الأدوار:" : "Roles:"}
                      <span className="ms-2 font-medium">
                        {user.roles.join(", ") || (isArabic ? "لم يتم تعيين دور" : "No role assigned")}
                      </span>
                    </p>
                    {user.departments.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isArabic ? "الشعب:" : "Service Divisions:"}
                        <span className="ms-2 font-medium">{user.departments.join(", ")}</span>
                      </p>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {isArabic ? arabicLoginErrors[error] ?? error : error}
                    </p>
                  )}
                  <Link
                    to="/moh/editor"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-card outline-none transition hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/40 active:translate-y-px"
                  >
                    {isArabic ? "فتح محرر دليل الخدمات" : "Open the services catalogue editor"}
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full rounded-xl"
                    onClick={() => void handleLogout()}
                  >
                    <LogOut aria-hidden="true" />
                    {isArabic ? "تسجيل الخروج" : "Sign out"}
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field className="space-y-2">
                      <FieldLabel htmlFor="email" className="text-sm font-medium leading-none">
                        {isArabic ? "البريد الإلكتروني" : "Email"}
                      </FieldLabel>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@ministry.gov"
                        dir="ltr"
                        className={inputClass}
                      />
                    </Field>

                    <Field className="space-y-2">
                      <FieldLabel htmlFor="password" className="text-sm font-medium leading-none">
                        {isArabic ? "كلمة المرور" : "Password"}
                      </FieldLabel>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder={isArabic ? "أدخل كلمة المرور" : "Enter your password"}
                        autoComplete="current-password"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={inputClass}
                      />
                    </Field>

                    {error && (
                      <p
                        role="alert"
                        className="animate-in rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive duration-300 fade-in-0 slide-in-from-top-1"
                      >
                        {isArabic ? arabicLoginErrors[error] ?? error : error}
                      </p>
                    )}
                  </FieldGroup>

                  <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={status === "loading"}>
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
            </div>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground md:hidden">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {authorizedNote}
          </p>
        </div>
      </main>
    </>
  );
}
