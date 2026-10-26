import { useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Check,
  Copy,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Table as TableIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tip } from "@/components/ui/tip";
import { extensions } from "@/lib/guide-tiptap";
import { cn } from "@/lib/utils";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

type Props = {
  /** The html stored for this label (Word or Tiptap) */
  html: string;
  /** Called with the new html on every change (an empty document gives "") */
  onChange: (html: string) => void;
  disabled?: boolean;
};

/** A Tiptap editor for one label's text. The toolbar shows only while the cell has focus, so the table stays clean. */
export function RichEditor({ html, onChange, disabled }: Props) {
  const editor = useEditor({
    extensions,
    content: html,
    editable: !disabled,
    editorProps: { attributes: { dir: "rtl", class: "px-3 py-2" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="group rounded-md border border-transparent bg-card focus-within:border-border focus-within:ring-2 focus-within:ring-ring/30 hover:border-border">
      {!disabled && (
        <div className="hidden group-focus-within:block">
          <Toolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} className="rich-content" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [showJson, setShowJson] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      inTable: editor.isActive("table"),
      // the text is right-to-left: text with no alignment set starts on the right
      center: editor.isActive({ textAlign: "center" }),
      left: editor.isActive({ textAlign: "left" }),
      justify: editor.isActive({ textAlign: "justify" }),
      fontSize: (editor.getAttributes("textStyle")["fontSize"] as string | undefined) ?? "",
      color: (editor.getAttributes("textStyle")["color"] as string | undefined) ?? "#000000",
      highlight: (editor.getAttributes("highlight")["color"] as string | undefined) ?? "#fde68a",
    }),
  });

  const chain = () => editor.chain().focus();
  const right = !state.center && !state.left && !state.justify;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1 py-1">
      <Btn label={t("عريض", "Bold")} active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </Btn>
      <Btn label={t("مائل", "Italic")} active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </Btn>
      <Btn label={t("تسطير", "Underline")} active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineIcon />
      </Btn>
      <Sep />
      <select
        aria-label={t("حجم الخط", "Font size")}
        className="h-7 rounded border bg-card px-1 text-xs"
        value={state.fontSize}
        onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}
      >
        <option value="">{t("الحجم", "Size")}</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {parseInt(s)}
          </option>
        ))}
      </select>
      <ColorPick label={t("لون النص", "Text colour")} icon={<Palette />} value={state.color} onChange={(c) => chain().setColor(c).run()} />
      <ColorPick
        label={t("تظليل (زر الفأرة الأيمن للإزالة)", "Highlight (right-click to remove)")}
        icon={<Highlighter />}
        value={state.highlight}
        onChange={(c) => chain().setHighlight({ color: c }).run()}
        onClear={() => chain().unsetHighlight().run()}
      />
      <Sep />
      <Btn label={t("قائمة نقطية", "Bullet list")} active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </Btn>
      <Btn label={t("قائمة مرقمة", "Numbered list")} active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </Btn>
      <Sep />
      <Btn label={t("محاذاة لليمين", "Align right")} active={right} onClick={() => chain().setTextAlign("right").run()}>
        <AlignRight />
      </Btn>
      <Btn label={t("توسيط", "Centre")} active={state.center} onClick={() => chain().setTextAlign("center").run()}>
        <AlignCenter />
      </Btn>
      <Btn label={t("محاذاة لليسار", "Align left")} active={state.left} onClick={() => chain().setTextAlign("left").run()}>
        <AlignLeft />
      </Btn>
      <Btn label={t("ضبط", "Justify")} active={state.justify} onClick={() => chain().setTextAlign("justify").run()}>
        <AlignJustify />
      </Btn>
      <Sep />
      <Btn label={t("إدراج جدول", "Insert table")} onClick={() => chain().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>
        <TableIcon />
      </Btn>
      {state.inTable && (
        <>
          <TextBtn onClick={() => chain().addRowAfter().run()}>{t("+ صف", "+ Row")}</TextBtn>
          <TextBtn onClick={() => chain().addColumnAfter().run()}>{t("+ عمود", "+ Col")}</TextBtn>
          <TextBtn onClick={() => chain().deleteRow().run()}>{t("− صف", "− Row")}</TextBtn>
          <TextBtn onClick={() => chain().deleteColumn().run()}>{t("− عمود", "− Col")}</TextBtn>
          <TextBtn onClick={() => chain().deleteTable().run()}>{t("حذف الجدول", "Delete table")}</TextBtn>
        </>
      )}
      <span className="ms-auto" />
      <Btn label="JSON" onClick={() => setShowJson(true)}>
        <Braces />
      </Btn>
      {showJson && <JsonDialog json={JSON.stringify(editor.getJSON(), null, 2)} onClose={() => setShowJson(false)} />}
    </div>
  );
}

/** Read-only popup with the Tiptap JSON of the cell */
function JsonDialog({ json, onClose }: { json: string; onClose: () => void }) {
  const { isArabic } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tiptap JSON</DialogTitle>
        </DialogHeader>
        <pre dir="ltr" className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs leading-5">
          {json}
        </pre>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={copy}>
          {copied ? <Check /> : <Copy />} {copied ? (isArabic ? "تم النسخ" : "Copied") : isArabic ? "نسخ" : "Copy"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Btn({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-4",
          active && "bg-primary/15 text-primary",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}

function TextBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-7 rounded px-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ColorPick({
  label,
  icon,
  value,
  onChange,
  onClear,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (c: string) => void;
  onClear?: () => void;
}) {
  return (
    <Tip label={label}>
      <label
        className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent [&_svg]:size-4"
        onContextMenu={(e) => {
          if (onClear) {
            e.preventDefault();
            onClear();
          }
        }}
      >
        {icon}
        <span className="absolute inset-x-1 bottom-0.5 h-1 rounded" style={{ background: value }} />
        <input type="color" aria-label={label} className="sr-only" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </Tip>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}
