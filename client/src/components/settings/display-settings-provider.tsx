import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { colors } from "@/styles/colors";
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  type ColorMode,
  type ContrastLevel,
  type DisplaySettings,
  type PrimaryColor,
  type SecondaryColor,
} from "@/components/settings/display-settings";
import { DisplaySettingsContext } from "@/components/settings/display-settings-context";

type StoredSettings = Pick<
  DisplaySettings,
  "primaryColor" | "secondaryColor" | "contrast" | "fontScale" | "mode"
>;

const STORAGE_KEY = "ministry-services-display-settings";
const DEFAULT_SETTINGS: StoredSettings = {
  primaryColor: "red",
  secondaryColor: "sea",
  contrast: "normal",
  fontScale: 1,
  mode: "light",
};
const primaryPalette = {
  red: colors.primary_red,
  gold: colors.primary_gold,
} satisfies Record<PrimaryColor, string>;
const secondaryPalette = {
  sea: colors.secondary_sea,
  palm: colors.secondary_palm,
  sand: colors.secondary_sand,
  mountain: colors.secondary_mountain,
  water: colors.secondary_water,
  culture: colors.secondary_culture,
} satisfies Record<SecondaryColor, string>;

function getContrastingForeground(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  if (!channels) {
    throw new Error(`Invalid palette color: ${hex}`);
  }

  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#111111" : "#ffffff";
}

function getStoredSettings(): StoredSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;

    const candidate = parsed as Partial<StoredSettings>;
    return {
      primaryColor:
        candidate.primaryColor &&
        Object.hasOwn(primaryPalette, candidate.primaryColor)
          ? candidate.primaryColor
          : DEFAULT_SETTINGS.primaryColor,
      secondaryColor:
        candidate.secondaryColor &&
        Object.hasOwn(secondaryPalette, candidate.secondaryColor)
          ? candidate.secondaryColor
          : DEFAULT_SETTINGS.secondaryColor,
      contrast:
        candidate.contrast === "high" || candidate.contrast === "maximum"
          ? candidate.contrast
          : DEFAULT_SETTINGS.contrast,
      fontScale:
        typeof candidate.fontScale === "number" &&
        candidate.fontScale >= FONT_SCALE_MIN &&
        candidate.fontScale <= FONT_SCALE_MAX
          ? candidate.fontScale
          : DEFAULT_SETTINGS.fontScale,
      mode: candidate.mode === "dark" ? "dark" : DEFAULT_SETTINGS.mode,
    };
  } catch (error) {
    console.warn("Unable to read saved display settings.", error);
    return DEFAULT_SETTINGS;
  }
}

export function DisplaySettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<StoredSettings>(getStoredSettings);

  useEffect(() => {
    const root = document.documentElement;
    const primary = primaryPalette[settings.primaryColor];
    const secondary = secondaryPalette[settings.secondaryColor];

    root.classList.toggle("dark", settings.mode === "dark");
    root.dataset.contrast = settings.contrast;
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", getContrastingForeground(primary));
    root.style.setProperty("--secondary-accent", secondary);
    root.style.setProperty(
      "--secondary-accent-foreground",
      getContrastingForeground(secondary),
    );
    root.style.setProperty("--font-scale", String(settings.fontScale));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("Unable to save display settings.", error);
    }
  }, [settings]);

  const setPrimaryColor = useCallback(
    (primaryColor: PrimaryColor) =>
      setSettings((current) => ({ ...current, primaryColor })),
    [],
  );
  const setSecondaryColor = useCallback(
    (secondaryColor: SecondaryColor) =>
      setSettings((current) => ({ ...current, secondaryColor })),
    [],
  );
  const setContrast = useCallback(
    (contrast: ContrastLevel) =>
      setSettings((current) => ({ ...current, contrast })),
    [],
  );
  const setFontScale = useCallback(
    (fontScale: number) =>
      setSettings((current) => ({
        ...current,
        fontScale: Math.min(
          FONT_SCALE_MAX,
          Math.max(FONT_SCALE_MIN, fontScale),
        ),
      })),
    [],
  );
  const setMode = useCallback(
    (mode: ColorMode) => setSettings((current) => ({ ...current, mode })),
    [],
  );
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({
      ...settings,
      setPrimaryColor,
      setSecondaryColor,
      setContrast,
      setFontScale,
      setMode,
      resetSettings,
    }),
    [
      settings,
      setPrimaryColor,
      setSecondaryColor,
      setContrast,
      setFontScale,
      setMode,
      resetSettings,
    ],
  );

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}
