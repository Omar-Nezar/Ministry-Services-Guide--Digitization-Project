import { DEFAULT_LABEL_COLOR, editorApi, type GuideLabel } from "@/lib/guide-api";
import { RichEditor } from "./rich-editor";

type Props = {
  serviceId: number;
  label: GuideLabel;
  disabled: boolean;
  /** Registers this row's unsaved text; the page's Save button runs `save` */
  onDirty: (key: string, save: () => Promise<unknown>) => void;
};

/** One table row: the label cell (right side in Arabic) and its text. Nothing is stored until Save is pressed. */
export function EntryRow({ serviceId, label, disabled, onDirty }: Props) {
  return (
    <div className="flex overflow-hidden rounded-md border bg-card" dir="rtl">
      <div
        style={{ width: "max(28%, 6rem)", background: label.color ?? DEFAULT_LABEL_COLOR }}
        className="flex shrink-0 flex-col justify-between gap-2 p-2 text-white"
      >
        <span className="min-w-0 text-sm font-bold leading-6">{label.name}</span>
      </div>
      <div className="min-w-0 flex-1 bg-muted/40 p-1.5">
        <RichEditor
          html={label.html}
          disabled={disabled}
          onChange={(html) => onDirty(`section-${label.key}`, () => editorApi.saveSection(serviceId, label.key, html))}
        />
      </div>
    </div>
  );
}
