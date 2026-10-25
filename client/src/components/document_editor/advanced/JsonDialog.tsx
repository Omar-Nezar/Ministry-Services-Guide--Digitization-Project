import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, X } from "lucide-react";

type Props = {
  title: string;
  json: string;
  onClose: () => void;
};

export function JsonDialog({ title, json, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  let pretty = "";
  try {
    pretty = json ? JSON.stringify(JSON.parse(json), null, 2) : "";
  } catch {
    pretty = json;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(pretty);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`JSON: ${title}`}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 rounded-xl border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h3 className="flex-1 font-semibold">Tiptap JSON — {title}</h3>
          <Button size="sm" variant="outline" onClick={copy} disabled={!pretty}>
            {copied ? <Check /> : <Copy />} {copied ? "تم النسخ" : "نسخ"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="إغلاق">
            <X />
          </Button>
        </div>
        <pre dir="ltr" className="flex-1 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs leading-5">
          {pretty || "// لا يوجد محتوى بعد (empty)"}
        </pre>
      </div>
    </div>,
    document.body,
  );
}
