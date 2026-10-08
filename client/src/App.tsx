import { DisplaySettingsProvider } from "@/components/settings/display-settings-provider";
import { RecipientHome } from "@/components/recipient/recipient_home";

function App() {
  return (
    <DisplaySettingsProvider>
      <RecipientHome />
    </DisplaySettingsProvider>
  );
}

export default App;
