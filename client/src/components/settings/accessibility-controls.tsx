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
  type ContrastLevel,
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

export function AccessibilityControls({
  isArabic = false,
}: {
  isArabic?: boolean;
}) {
  const { contrast, fontScale, setContrast, setFontScale, resetSettings } =
    useDisplaySettings();
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
        className="absolute inset-e-0 top-11 z-20 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        aria-label={isArabic ? "إعدادات إمكانية الوصول" : "Accessibility settings"}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
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

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {isArabic ? "حجم النص" : "Text size"}
          </legend>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-2">
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

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">
            {isArabic ? "تباين الألوان" : "Color contrast"}
          </legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {contrastOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setContrast(option.value)}
                aria-pressed={contrast === option.value}
                className="min-h-9 rounded-lg px-2 text-xs font-medium outline-none transition hover:bg-background focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                {isArabic ? option.arabicLabel : option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {isArabic
            ? "تُحفظ تفضيلات العرض على هذا الجهاز."
            : "Your display preferences are saved on this device."}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
