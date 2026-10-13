import { lazy, Suspense } from "react";
import { DisplaySettingsProvider } from "@/components/settings/display-settings-provider";
import { Home } from "@/components/general/home";
import { Login } from "@/components/moh/login";
import { RecipientHome } from "@/components/recipient/recipient_home";
import { Navigate, Route, Routes } from "react-router";
import { LanguageProvider } from "@/components/settings/language-provider";

const Editor = lazy(() =>
  import("@/components/moh/editor_render").then(({ Editor }) => ({
    default: Editor,
  })),
);
const EditorPage = lazy(() =>
  import("@/components/moh/editor_page").then(({ EditorPage }) => ({
    default: EditorPage,
  })),
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
              <Suspense fallback={null}>
                <Editor />
              </Suspense>
            }
          />
          <Route
            path="/guide"
            element={
              <Suspense fallback={null}>
                <EditorPage />
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
