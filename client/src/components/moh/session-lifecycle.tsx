import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/components/settings/language-context";
import {
  checkCurrentSession,
  dismissSessionExpired,
  logoutUser,
  refreshSession,
} from "@/slices/auth.slice";
import type { AppDispatch, RootState } from "@/store/store";

const SESSION_WARNING_MS = 5 * 60 * 1000;

export function SessionLifecycle() {
  const { isArabic } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const expiresAt = useSelector((state: RootState) => state.auth.expiresAt);
  const sessionExpiredDialog = useSelector((state: RootState) => state.auth.sessionExpired);
  const isRefreshing = useSelector((state: RootState) => state.auth.isRefreshingSession);
  const refreshError = useSelector((state: RootState) => state.auth.sessionRefreshError);
  const isCheckingSession = useSelector((state: RootState) => state.auth.isCheckingSession);
  const sessionCheckError = useSelector((state: RootState) => state.auth.sessionCheckError);
  const logoutError = useSelector((state: RootState) => state.auth.error);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [lastSessionCheckAt, setLastSessionCheckAt] = useState<number | null>(null);
  const refreshPromptOpen =
    Boolean(user) &&
    expiresAt !== null &&
    expiresAt - currentTime <= SESSION_WARNING_MS;

  useEffect(() => {
    if (!user || expiresAt === null) return;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      if (isRefreshing || isCheckingSession) return;

      const retryDelay =
        lastSessionCheckAt === null
          ? 0
          : Math.max(0, 15_000 - (Date.now() - lastSessionCheckAt));
      const checkTimer = window.setTimeout(() => {
        void dispatch(checkCurrentSession()).finally(() => {
          setLastSessionCheckAt(Date.now());
        });
      }, retryDelay);
      return () => window.clearTimeout(checkTimer);
    }

    let warningTimer: number | undefined;
    if (remaining > SESSION_WARNING_MS) {
      warningTimer = window.setTimeout(
        () => setCurrentTime(Date.now()),
        remaining - SESSION_WARNING_MS,
      );
    }

    const expirationTimer = window.setTimeout(() => {
      if (!isRefreshing && !isCheckingSession) {
        void dispatch(checkCurrentSession()).finally(() => {
          setLastSessionCheckAt(Date.now());
        });
      }
    }, remaining);

    return () => {
      if (warningTimer !== undefined) window.clearTimeout(warningTimer);
      window.clearTimeout(expirationTimer);
    };
  }, [
    dispatch,
    expiresAt,
    isCheckingSession,
    isRefreshing,
    lastSessionCheckAt,
    user,
  ]);

  async function handleRefresh() {
    await dispatch(refreshSession());
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await dispatch(logoutUser());
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleExpiredAcknowledge() {
    dispatch(dismissSessionExpired());
    navigate("/moh/login", { replace: true });
  }

  const sessionActionError = refreshError || sessionCheckError || logoutError;

  return (
    <>
      <AlertDialog open={refreshPromptOpen && Boolean(user)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? "ستنتهي جلستك قريبًا" : "Your session is about to expire"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? sessionCheckError
                  ? "تعذر التحقق من صلاحية جلستك. جدّدها للمتابعة بأمان."
                  : isCheckingSession
                    ? "جارٍ التحقق من صلاحية جلستك..."
                    : "شارفت جلستك على الانتهاء. جدّدها الآن لمواصلة العمل دون انقطاع."
                : sessionCheckError
                  ? "We couldn't verify whether your session is still active. Refresh it to continue safely."
                  : isCheckingSession
                    ? "Verifying your session..."
                    : "Your session is nearing expiration. Refresh it now to continue working without interruption."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sessionActionError && (
            <p role="alert" className="text-sm text-destructive">
              {isArabic
                ? "تعذر إكمال الطلب. تحقق من اتصالك وحاول مرة أخرى."
                : sessionActionError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogAction
              variant="outline"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut || isRefreshing || isCheckingSession}
            >
              {isArabic ? "تسجيل الخروج" : "Sign out"}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => void handleRefresh()}
              disabled={isRefreshing || isLoggingOut || isCheckingSession}
            >
              {isCheckingSession
                ? isArabic
                  ? "جارٍ التحقق..."
                  : "Checking session..."
                : isRefreshing
                  ? isArabic
                    ? "جارٍ تجديد الجلسة..."
                    : "Refreshing session..."
                  : isArabic
                    ? "تجديد الجلسة"
                    : "Refresh session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sessionExpiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? "انتهت جلستك" : "Your session has ended"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? "انتهت صلاحية جلستك أو تم إنهاؤها. سجّل الدخول مرة أخرى للمتابعة."
                : "Your session expired or was ended. Sign in again to continue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleExpiredAcknowledge}>
              {isArabic ? "الانتقال إلى تسجيل الدخول" : "Go to sign in"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
