import { useState } from "react";
import { ChevronDown, Moon, Palette, Sun } from "lucide-react";
import { useDisplaySettings } from "@/components/settings/use-display-settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  PrimaryColor,
  SecondaryColor,
} from "@/components/settings/display-settings";
import { colors } from "@/styles/colors";
import { Button } from "@/components/ui/button";

const primaryColors: {
  id: PrimaryColor;
  label: string;
  arabicLabel: string;
  color: string;
}[] = [
  {
    id: "red",
    label: "Red",
    arabicLabel: "الأحمر",
    color: colors.primary_red,
  },
  {
    id: "gold",
    label: "Gold",
    arabicLabel: "الذهبي",
    color: colors.primary_gold,
  },
];

const secondaryColors: {
  id: SecondaryColor;
  label: string;
  arabicLabel: string;
  color: string;
}[] = [
  {
    id: "sea",
    label: "Sea",
    arabicLabel: "البحر",
    color: colors.secondary_sea,
  },
  {
    id: "palm",
    label: "Palm",
    arabicLabel: "النخيل",
    color: colors.secondary_palm,
  },
  {
    id: "sand",
    label: "Sand",
    arabicLabel: "الرمال",
    color: colors.secondary_sand,
  },
  {
    id: "mountain",
    label: "Mountain",
    arabicLabel: "الجبل",
    color: colors.secondary_mountain,
  },
  {
    id: "water",
    label: "Water",
    arabicLabel: "الماء",
    color: colors.secondary_water,
  },
  {
    id: "culture",
    label: "Culture",
    arabicLabel: "الثقافة",
    color: colors.secondary_culture,
  },
];

export function ThemeSwitcher({
  isArabic = false,
  compact = false,
}: {
  isArabic?: boolean;
  compact?: boolean;
}) {
  const {
    primaryColor,
    secondaryColor,
    mode,
    setPrimaryColor,
    setSecondaryColor,
    setMode,
  } = useDisplaySettings();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group relative"
    >
      <CollapsibleTrigger
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color-mix(in_oklch,var(--secondary-accent-foreground)_35%,transparent)] px-3 text-sm font-medium text-[var(--secondary-accent-foreground)] outline-none transition hover:bg-[color-mix(in_oklch,var(--secondary-accent-foreground)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--secondary-accent-foreground)]"
        aria-label={isArabic ? "إعدادات المظهر" : "Appearance settings"}
      >
        <Palette aria-hidden="true" className="size-4" />
        <span className={compact ? "hidden sm:inline" : ""}>
          {isArabic ? "المظهر" : "Appearance"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 opacity-75 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent
        className="absolute inset-e-0 top-11 z-30 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        aria-label={isArabic ? "إعدادات المظهر" : "Appearance settings"}
      >
        <div className="mb-5">
          <h2 className="font-semibold">
            {isArabic ? "تخصيص الألوان" : "Customize colors"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isArabic
              ? "اختر اللون الأساسي والثانوي كلٌّ على حدة."
              : "Choose primary and secondary colors independently."}
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {isArabic ? "اللون الأساسي" : "Primary color"}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {primaryColors.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPrimaryColor(option.id)}
                aria-pressed={primaryColor === option.id}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-start text-sm outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span
                  className="size-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: option.color }}
                />
                {isArabic ? option.arabicLabel : option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">
            {isArabic ? "اللون الثانوي" : "Secondary color"}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {secondaryColors.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSecondaryColor(option.id)}
                aria-pressed={secondaryColor === option.id}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-start text-sm outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span
                  className="size-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: option.color }}
                />
                {isArabic ? option.arabicLabel : option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">
            {isArabic ? "نمط العرض" : "Color mode"}
          </legend>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "light" ? "secondary" : "outline"}
              size="sm"
              aria-pressed={mode === "light"}
              onClick={() => setMode("light")}
            >
              <Sun aria-hidden="true" />
              {isArabic ? "فاتح" : "Light"}
            </Button>
            <Button
              type="button"
              variant={mode === "dark" ? "secondary" : "outline"}
              size="sm"
              aria-pressed={mode === "dark"}
              onClick={() => setMode("dark")}
            >
              <Moon aria-hidden="true" />
              {isArabic ? "داكن" : "Dark"}
            </Button>
          </div>
        </fieldset>
      </CollapsibleContent>
    </Collapsible>
  );
}
