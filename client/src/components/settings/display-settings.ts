export type PrimaryColor = "red" | "gold";
export type SecondaryColor =
  | "sea"
  | "palm"
  | "sand"
  | "mountain"
  | "water"
  | "culture";
export type ContrastLevel = "normal" | "high" | "maximum";
export type ColorMode = "light" | "dark";
export type SpacingLevel = "normal" | "wide" | "wider" | "widest";
export type TextAlignment = "default" | "left" | "center" | "right";
export type ColorFilter = "none" | "grayscale" | "inverted";

export type DisplaySettings = {
  primaryColor: PrimaryColor;
  secondaryColor: SecondaryColor;
  contrast: ContrastLevel;
  fontScale: number;
  mode: ColorMode;
  letterSpacing: SpacingLevel;
  lineSpacing: SpacingLevel;
  textAlign: TextAlignment;
  colorFilter: ColorFilter;
  dyslexiaFont: boolean;
  highlightLinks: boolean;
  largeCursor: boolean;
  reduceMotion: boolean;
  setPrimaryColor: (color: PrimaryColor) => void;
  setSecondaryColor: (color: SecondaryColor) => void;
  setContrast: (contrast: ContrastLevel) => void;
  setFontScale: (scale: number) => void;
  setMode: (mode: ColorMode) => void;
  setLetterSpacing: (level: SpacingLevel) => void;
  setLineSpacing: (level: SpacingLevel) => void;
  setTextAlign: (alignment: TextAlignment) => void;
  setColorFilter: (filter: ColorFilter) => void;
  setDyslexiaFont: (enabled: boolean) => void;
  setHighlightLinks: (enabled: boolean) => void;
  setLargeCursor: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  resetSettings: () => void;
};

export const FONT_SCALE_MIN = 0.9;
export const FONT_SCALE_MAX = 1.3;
export const FONT_SCALE_STEP = 0.1;
