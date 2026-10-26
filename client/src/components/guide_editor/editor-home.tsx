import { useLanguage } from "@/components/settings/language-context";

/** Shown at /moh/editor before a service is chosen. */
export function EditorHome() {
  const { isArabic } = useLanguage();
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed px-6 text-center text-muted-foreground">
      {isArabic ? "اختر خدمة من القائمة لتحرير محتواها." : "Choose a service from the list to edit its content."}
    </div>
  );
}
