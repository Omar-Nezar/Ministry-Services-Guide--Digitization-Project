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

export type DisplaySettings = {
  primaryColor: PrimaryColor;
  secondaryColor: SecondaryColor;
  contrast: ContrastLevel;
  fontScale: number;
  mode: ColorMode;
  setPrimaryColor: (color: PrimaryColor) => void;
  setSecondaryColor: (color: SecondaryColor) => void;
  setContrast: (contrast: ContrastLevel) => void;
  setFontScale: (scale: number) => void;
  setMode: (mode: ColorMode) => void;
  resetSettings: () => void;
};

export const FONT_SCALE_MIN = 0.9;
export const FONT_SCALE_MAX = 1.3;
export const FONT_SCALE_STEP = 0.1;
