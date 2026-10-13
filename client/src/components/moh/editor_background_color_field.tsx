import { useState } from "react";
import { colors } from "@/styles/colors";

const storageKey = "moh-editor-background-palette";

const builtInBackgroundColors = [
  { label: "Sea", value: colors.secondary_sea },
  { label: "Palm", value: colors.secondary_palm },
  { label: "Sand", value: colors.secondary_sand },
  { label: "Mountain", value: colors.secondary_mountain },
  { label: "Water", value: colors.secondary_water },
  { label: "Culture", value: colors.secondary_culture },
  { label: "White", value: "#ffffff" },
];

function readCustomBackgroundColors() {
  try {
    const value = localStorage.getItem(storageKey);
    const colors: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(colors)
      ? colors.filter(
          (color): color is string =>
            typeof color === "string" && /^#[\da-f]{6}$/i.test(color),
        )
      : [];
  } catch (error) {
    console.error("Unable to load the editor color palette.", error);
    return [];
  }
}

export function BackgroundColorField({
  value,
  onChange,
  isArabic,
}: {
  value: string;
  onChange: (color: string) => void;
  isArabic: boolean;
}) {
  const [customColors, setCustomColors] = useState(readCustomBackgroundColors);
  const selectedColor = value || "transparent";
  const palette = [
    { label: isArabic ? "شفاف" : "Transparent", value: "transparent" },
    ...builtInBackgroundColors.map(({ label, value: color }) => ({
      label:
        isArabic && label === "White"
                ? "أبيض"
                : isArabic && label === "Sea"
                  ? "بحري"
                  : isArabic && label === "Mountain"
                    ? "جبلي"
                    : isArabic && label === "Culture"
                      ? "ثقافي"
                : isArabic && label === "Sand"
                  ? "رملي"
                : isArabic && label === "Water"
                  ? "مائي"
                : isArabic && label === "Palm"
                  ? "نخلي"
                  : label,
      value: color,
    })),
    ...customColors.map((color) => ({ label: color, value: color })),
  ];

  function addSelectedColor() {
    if (
      !/^#[\da-f]{6}$/i.test(selectedColor) ||
      palette.some(
        (color) => color.value.toLowerCase() === selectedColor.toLowerCase(),
      )
    ) {
      return;
    }

    const nextColors = [...customColors, selectedColor];
    localStorage.setItem(storageKey, JSON.stringify(nextColors));
    setCustomColors(nextColors);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {palette.map((color) => (
          <button
            key={color.value}
            type="button"
            aria-label={color.label}
            aria-pressed={
              selectedColor.toLowerCase() === color.value.toLowerCase()
            }
            title={color.label}
            onClick={() => onChange(color.value)}
            className="size-8 rounded border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={isArabic ? "لون مخصص" : "Custom color"}
          value={
            /^#[\da-f]{6}$/i.test(selectedColor) ? selectedColor : "#ffffff"
          }
          onChange={(event) => onChange(event.target.value)}
          className="size-9 cursor-pointer rounded border border-input bg-background p-1"
        />
        <button
          type="button"
          onClick={addSelectedColor}
          className="text-sm underline underline-offset-4"
        >
          {isArabic ? "إضافة اللون إلى اللوحة" : "Add color to palette"}
        </button>
      </div>
    </div>
  );
}
