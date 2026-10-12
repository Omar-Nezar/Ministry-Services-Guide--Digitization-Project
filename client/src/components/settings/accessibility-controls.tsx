import { useState } from "react";
import { Accessibility, ChevronDown, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDisplaySettings } from "@/components/settings/use-display-settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  type ColorFilter,
  type ContrastLevel,
  type SpacingLevel,
  type TextAlignment,
} from "@/components/settings/display-settings";

const contrastOptions: {
  value: ContrastLevel;
  label: string;
  arabicLabel: string;
}[] = [
  { value: "normal", label: "Standard", arabicLabel: "قياسي" },
  { value: "high", label: "High", arabicLabel: "مرتفع" },
  { value: "maximum", label: "Highest", arabicLabel: "الأعلى" },
];

const spacingOptions: {
  value: SpacingLevel;
  label: string;
  arabicLabel: string;
}[] = [
  { value: "normal", label: "Normal", arabicLabel: "قياسي" },
  { value: "wide", label: "Wide", arabicLabel: "واسع" },
  { value: "wider", label: "Wider", arabicLabel: "أوسع" },
  { value: "widest", label: "Widest", arabicLabel: "الأوسع" },
];

const alignmentOptions: {
  value: TextAlignment;
  label: string;
  arabicLabel: string;
}[] = [
  { value: "default", label: "Default", arabicLabel: "افتراضي" },
  { value: "left", label: "Left", arabicLabel: "يسار" },
  { value: "center", label: "Center", arabicLabel: "وسط" },
  { value: "right", label: "Right", arabicLabel: "يمين" },
];

const colorFilterOptions: {
  value: ColorFilter;
  label: string;
  arabicLabel: string;
}[] = [
  { value: "none", label: "None", arabicLabel: "بدون" },
  { value: "grayscale", label: "Black & white", arabicLabel: "أبيض وأسود" },
  { value: "inverted", label: "Inverted", arabicLabel: "معكوس" },
];

function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  isArabic,
  className = "",
  columns = "grid-cols-3",
}: {
  legend: string;
  options: { value: T; label: string; arabicLabel: string }[];
  value: T;
  onChange: (value: T) => void;
  isArabic: boolean;
  className?: string;
  columns?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className={`grid ${columns} gap-1 rounded-xl bg-muted p-1`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className="min-h-8 rounded-lg px-0.5 text-[0.7rem] font-medium outline-none sm:px-2 sm:text-xs transition hover:bg-background focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {isArabic ? option.arabicLabel : option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-border px-2.5 text-start text-xs sm:text-sm font-medium outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full bg-muted-foreground/40 transition-colors group-aria-checked:bg-primary"
      >
        <span className="absolute start-0.5 top-0.5 size-4 rounded-full bg-background shadow transition-transform group-aria-checked:translate-x-4 rtl:group-aria-checked:-translate-x-4" />
      </span>
    </button>
  );
}

export function AccessibilityControls({
  isArabic = false,
}: {
  isArabic?: boolean;
}) {
  const {
    contrast,
    fontScale,
    letterSpacing,
    lineSpacing,
    textAlign,
    colorFilter,
    dyslexiaFont,
    highlightLinks,
    largeCursor,
    setContrast,
    setFontScale,
    setLetterSpacing,
    setLineSpacing,
    setTextAlign,
    setColorFilter,
    setDyslexiaFont,
    setHighlightLinks,
    setLargeCursor,
    resetSettings,
  } = useDisplaySettings();
  const percentage = Math.round(fontScale * 100);
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
        aria-label={isArabic ? "إعدادات إمكانية الوصول" : "Accessibility settings"}
      >
        <Accessibility aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">
          {isArabic ? "إمكانية الوصول" : "Accessibility"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 opacity-75 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className="fixed inset-x-3 top-14 z-50 mx-auto max-w-4xl rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl sm:inset-x-4 sm:p-5"
        aria-label={isArabic ? "إعدادات إمكانية الوصول" : "Accessibility settings"}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              {isArabic ? "إعدادات العرض" : "Display settings"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isArabic
                ? "خصص المظهر لراحة أكبر."
                : "Adjust the page for a more comfortable view."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={resetSettings}
            aria-label={isArabic ? "إعادة ضبط الإعدادات" : "Reset settings"}
            title={isArabic ? "إعادة ضبط" : "Reset"}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-3 lg:gap-x-6">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              {isArabic ? "حجم النص" : "Text size"}
            </legend>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setFontScale(fontScale - FONT_SCALE_STEP)}
                disabled={fontScale <= FONT_SCALE_MIN}
                aria-label={isArabic ? "تصغير النص" : "Decrease text size"}
              >
                <Minus aria-hidden="true" />
              </Button>
              <output className="min-w-12 text-center text-sm tabular-nums" aria-live="polite">
                {percentage}%
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setFontScale(fontScale + FONT_SCALE_STEP)}
                disabled={fontScale >= FONT_SCALE_MAX}
                aria-label={isArabic ? "تكبير النص" : "Increase text size"}
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </fieldset>

          <SegmentedControl
            legend={isArabic ? "تباين الألوان" : "Color contrast"}
            options={contrastOptions}
            value={contrast}
            onChange={setContrast}
            isArabic={isArabic}
          />

          <SegmentedControl
            legend={isArabic ? "ألوان الصفحة" : "Page colors"}
            options={colorFilterOptions}
            value={colorFilter}
            onChange={setColorFilter}
            isArabic={isArabic}
          />

          <SegmentedControl
            legend={isArabic ? "تباعد الأحرف" : "Letter spacing"}
            options={spacingOptions}
            value={letterSpacing}
            onChange={setLetterSpacing}
            isArabic={isArabic}
            columns="grid-cols-4"
          />

          <SegmentedControl
            legend={isArabic ? "تباعد الأسطر" : "Line spacing"}
            options={spacingOptions}
            value={lineSpacing}
            onChange={setLineSpacing}
            isArabic={isArabic}
            columns="grid-cols-4"
          />

          <SegmentedControl
            legend={isArabic ? "محاذاة النص" : "Text alignment"}
            options={alignmentOptions}
            value={textAlign}
            onChange={setTextAlign}
            isArabic={isArabic}
            columns="grid-cols-4"
          />

          <fieldset className="col-span-2 lg:col-span-3">
            <legend className="mb-1.5 text-sm font-medium">
              {isArabic ? "خيارات القراءة" : "Reading aids"}
            </legend>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              <ToggleRow
                label={isArabic ? "خط مناسب لعسر القراءة" : "Dyslexia-friendly font"}
                checked={dyslexiaFont}
                onChange={setDyslexiaFont}
              />
              <ToggleRow
                label={isArabic ? "تمييز الروابط والعناوين" : "Highlight links & headings"}
                checked={highlightLinks}
                onChange={setHighlightLinks}
              />
              <ToggleRow
                label={isArabic ? "مؤشر كبير" : "Large cursor"}
                checked={largeCursor}
                onChange={setLargeCursor}
              />
            </div>
          </fieldset>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {isArabic
            ? "تُحفظ تفضيلات العرض على هذا الجهاز."
            : "Your display preferences are saved on this device."}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
