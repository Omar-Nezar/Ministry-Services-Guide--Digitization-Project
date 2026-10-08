import { createContext } from "react";
import type { DisplaySettings } from "@/components/settings/display-settings";

export const DisplaySettingsContext =
  createContext<DisplaySettings | null>(null);
