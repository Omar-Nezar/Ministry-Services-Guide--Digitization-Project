import { lazy, Suspense } from "react";
import { DisplaySettingsProvider } from "@/components/settings/display-settings-provider";
import { LanguageProvider } from "@/components/settings/language-provider";
import { Home } from "@/components/general/home";
import { Login } from "@/components/moh/login";
import { ProtectedRoute } from "@/components/moh/protected-route";
import { SignedInRedirect } from "@/components/moh/signed-in-redirect";
import { GuideDivision } from "@/components/guide/guide-division";
import { GuideHome } from "@/components/guide/guide-home";
import { GuideLayout } from "@/components/guide/guide-layout";
import { GuideService } from "@/components/guide/guide-service";
import { Navigate, Route, Routes } from "react-router";

const DocumentEditor = lazy(
  () => import("@/components/document_editor/document_editor")
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
const LabelsPage = lazy(() =>
  import("@/components/guide_editor/labels-page").then((m) => ({ default: m.LabelsPage }))
);

function App() {
  return (
    <DisplaySettingsProvider>
      <LanguageProvider>
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
      </LanguageProvider>
    </DisplaySettingsProvider>
  );
}

export default App;
