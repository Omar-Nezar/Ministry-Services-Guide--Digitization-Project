
import { lazy, Suspense } from "react";
import { DisplaySettingsProvider } from "@/components/settings/display-settings-provider";
import { LanguageProvider } from "@/components/settings/language-provider";
import { Home } from "@/components/general/home";
import { Login } from "@/components/moh/login";
import { RecipientHome } from "@/components/recipient/recipient_home";
import { Navigate, Route, Routes } from "react-router";

const DocumentEditor = lazy(
  () => import("@/components/document_editor/DocumentEditor")
);

function App() {
  return (
    <DisplaySettingsProvider>
      <LanguageProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipient" element={<RecipientHome />} />
          <Route path="/moh" element={<Login />} />
          <Route path="/moh/login" element={<Login />} />

          <Route
            path="/moh/editor"
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
