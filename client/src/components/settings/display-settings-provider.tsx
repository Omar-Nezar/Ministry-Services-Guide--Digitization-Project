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
  type ColorFilter,
  type ColorMode,
  type ContrastLevel,
  type DisplaySettings,
  type PrimaryColor,
  type SecondaryColor,
  type SpacingLevel,
  type TextAlignment,
} from "@/components/settings/display-settings";
import { DisplaySettingsContext } from "@/components/settings/display-settings-context";

type StoredSettings = Pick<
  DisplaySettings,
  | "primaryColor"
  | "secondaryColor"
  | "contrast"
  | "fontScale"
  | "mode"
  | "letterSpacing"
  | "lineSpacing"
  | "textAlign"
  | "colorFilter"
  | "dyslexiaFont"
  | "highlightLinks"
  | "largeCursor"
  | "reduceMotion"
>;

const STORAGE_KEY = "ministry-services-display-settings";
const DEFAULT_SETTINGS: StoredSettings = {
  primaryColor: "red",
  secondaryColor: "sea",
  contrast: "normal",
  fontScale: 1,
  mode: "light",
  letterSpacing: "normal",
  lineSpacing: "normal",
  textAlign: "default",
  colorFilter: "none",
  dyslexiaFont: false,
  highlightLinks: false,
  largeCursor: false,
  reduceMotion: false,
};
const spacingLevels: SpacingLevel[] = ["normal", "wide", "wider", "widest"];
const textAlignments: TextAlignment[] = ["default", "left", "center", "right"];
const colorFilters: ColorFilter[] = ["none", "grayscale", "inverted"];
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
      letterSpacing: spacingLevels.includes(candidate.letterSpacing as SpacingLevel)
        ? (candidate.letterSpacing as SpacingLevel)
        : DEFAULT_SETTINGS.letterSpacing,
      lineSpacing: spacingLevels.includes(candidate.lineSpacing as SpacingLevel)
        ? (candidate.lineSpacing as SpacingLevel)
        : DEFAULT_SETTINGS.lineSpacing,
      textAlign: textAlignments.includes(candidate.textAlign as TextAlignment)
        ? (candidate.textAlign as TextAlignment)
        : DEFAULT_SETTINGS.textAlign,
      colorFilter: colorFilters.includes(candidate.colorFilter as ColorFilter)
        ? (candidate.colorFilter as ColorFilter)
        : DEFAULT_SETTINGS.colorFilter,
      dyslexiaFont: candidate.dyslexiaFont === true,
      highlightLinks: candidate.highlightLinks === true,
      largeCursor: candidate.largeCursor === true,
      reduceMotion: candidate.reduceMotion === true,
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
    root.dataset.letterSpacing = settings.letterSpacing;
    root.dataset.lineSpacing = settings.lineSpacing;
    root.dataset.textAlign = settings.textAlign;
    root.dataset.colorFilter = settings.colorFilter;
    root.dataset.dyslexiaFont = settings.dyslexiaFont ? "on" : "off";
    root.dataset.highlightLinks = settings.highlightLinks ? "on" : "off";
    root.dataset.largeCursor = settings.largeCursor ? "on" : "off";
    root.dataset.reduceMotion = settings.reduceMotion ? "on" : "off";
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
  const setLetterSpacing = useCallback(
    (letterSpacing: SpacingLevel) =>
      setSettings((current) => ({ ...current, letterSpacing })),
    [],
  );
  const setLineSpacing = useCallback(
    (lineSpacing: SpacingLevel) =>
      setSettings((current) => ({ ...current, lineSpacing })),
    [],
  );
  const setTextAlign = useCallback(
    (textAlign: TextAlignment) =>
      setSettings((current) => ({ ...current, textAlign })),
    [],
  );
  const setColorFilter = useCallback(
    (colorFilter: ColorFilter) =>
      setSettings((current) => ({ ...current, colorFilter })),
    [],
  );
  const setDyslexiaFont = useCallback(
    (dyslexiaFont: boolean) =>
      setSettings((current) => ({ ...current, dyslexiaFont })),
    [],
  );
  const setHighlightLinks = useCallback(
    (highlightLinks: boolean) =>
      setSettings((current) => ({ ...current, highlightLinks })),
    [],
  );
  const setLargeCursor = useCallback(
    (largeCursor: boolean) =>
      setSettings((current) => ({ ...current, largeCursor })),
    [],
  );
  const setReduceMotion = useCallback(
    (reduceMotion: boolean) =>
      setSettings((current) => ({ ...current, reduceMotion })),
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
      setLetterSpacing,
      setLineSpacing,
      setTextAlign,
      setColorFilter,
      setDyslexiaFont,
      setHighlightLinks,
      setLargeCursor,
      setReduceMotion,
      resetSettings,
    }),
    [
      settings,
      setPrimaryColor,
      setSecondaryColor,
      setContrast,
      setFontScale,
      setMode,
      setLetterSpacing,
      setLineSpacing,
      setTextAlign,
      setColorFilter,
      setDyslexiaFont,
      setHighlightLinks,
      setLargeCursor,
      setReduceMotion,
      resetSettings,
    ],
  );

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}
