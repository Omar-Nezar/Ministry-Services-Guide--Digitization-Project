import { useContext } from "react";
import { DisplaySettingsContext } from "@/components/settings/display-settings-context";

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error(
      "useDisplaySettings must be used within a DisplaySettingsProvider.",
    );
  }
  return context;
}
