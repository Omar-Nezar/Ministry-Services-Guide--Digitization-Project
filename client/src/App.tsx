import { lazy, Suspense, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DisplaySettingsProvider } from "@/components/settings/display-settings-provider";
import { LanguageProvider } from "@/components/settings/language-provider";
import { Home } from "@/components/general/home";
import { Login } from "@/components/moh/login";
import { ProtectedRoute } from "@/components/moh/protected-route";
import { SessionLifecycle } from "@/components/moh/session-lifecycle";
import { SignedInRedirect } from "@/components/moh/signed-in-redirect";
import { GuideDivision } from "@/components/guide/guide-division";
import { GuideHome } from "@/components/guide/guide-home";
import { GuideLayout } from "@/components/guide/guide-layout";
import { GuideService } from "@/components/guide/guide-service";
import { FeedbackSurvey } from "@/components/general/feedback-survey";
import { SiteFooter } from "@/components/general/site-footer";
import { loadCurrentUser } from "@/slices/auth.slice";
import type { AppDispatch, RootState } from "@/store/store";
import { Navigate, Route, Routes } from "react-router";

const DocumentEditor = lazy(() =>
  import("@/components/document_editor/document_editor")
);

// The services editor pulls in Tiptap and the flowchart editor: load it only for signed-in staff
const EditorLayout = lazy(() =>
  import("@/components/guide_editor/editor-layout").then((m) => ({ default: m.EditorLayout }))
);
const EditorHome = lazy(() =>
  import("@/components/guide_editor/editor-home").then((m) => ({ default: m.EditorHome }))
);
const ServiceEditor = lazy(() =>
  import("@/components/guide_editor/service-editor").then((m) => ({ default: m.ServiceEditor }))
);
const StaffPage = lazy(() =>
  import("@/components/guide_editor/staff-page").then((m) => ({ default: m.StaffPage }))
);
const LabelsPage = lazy(() =>
  import("@/components/guide_editor/labels-page").then((m) => ({ default: m.LabelsPage }))
);

const PdfPagesPage = lazy(() =>
  import("@/components/guide_editor/pdf-pages-page").then((m) => ({ default: m.PdfPagesPage }))
);
const FeedbackSurveyPage = lazy(() =>
  import("@/components/guide_editor/feedback-survey-page").then((m) => ({ default: m.FeedbackSurveyPage }))
);

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>();
  const initialized = useSelector((state: RootState) => state.auth.initialized);

  useEffect(() => {
    void dispatch(loadCurrentUser());
  }, [dispatch]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        {!initialized ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            Loading session...
          </div>
        ) : (
          <Routes>
            {/* Public pages: signed-in admin and staff are sent to the editor instead */}
            <Route element={<SignedInRedirect />}>
              <Route path="/" element={<Home />} />

              {/* The public services guide */}
              <Route path="/recipient" element={<GuideLayout />}>
                <Route index element={<GuideHome />} />
                <Route path="categories/:divisionId" element={<GuideDivision />} />
                <Route path="services/:serviceId" element={<GuideService />} />
              </Route>

              <Route path="/moh" element={<Login />} />
              <Route path="/moh/login" element={<Login />} />
            </Route>

            <Route path="/feedback" element={<FeedbackSurvey />} />

            {/* The services editor (admin and staff) */}
            <Route
              path="/moh/editor"
              element={
                <ProtectedRoute>
                  <Suspense
                    fallback={
                      <div className="flex min-h-screen items-center justify-center">
                        Loading editor...
                      </div>
                    }
                  >
                    <EditorLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<EditorHome />} />
              <Route path="service/:serviceId" element={<ServiceEditor />} />
              <Route path="labels" element={<LabelsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="pdf" element={<PdfPagesPage />} />
              <Route path="feedback-survey" element={<FeedbackSurveyPage />} />
            </Route>

            <Route
              path="/moh/document-editor"
              element={
                <Suspense
                  fallback={
                    <div className="flex min-h-screen items-center justify-center">
                      Loading document editor...
                    </div>
                  }
                >
                  <DocumentEditor />
                </Suspense>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function App() {
  return (
    <DisplaySettingsProvider>
      <LanguageProvider>
        <SessionLifecycle />
        <AppRoutes />
      </LanguageProvider>
    </DisplaySettingsProvider>
  );
}

export default App;