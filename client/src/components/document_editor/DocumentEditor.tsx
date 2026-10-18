
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Download,
  FileText,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  DocumentColumn,
  DocumentColumns,
} from "@/components/document_editor/document_columns";

import "./document_editor.css";

type PaperSize = "A4" | "A3";
type Orientation = "portrait" | "landscape";
type ColumnLayout = "single" | "four";
type BlockStyle =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3";

type DocumentSettings = {
  paperSize: PaperSize;
  orientation: Orientation;
  layout: ColumnLayout;
};

const PAPER_DIMENSIONS: Record<
  PaperSize,
  { width: number; height: number }
> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
};

function getPageDimensions(
  paperSize: PaperSize,
  orientation: Orientation,
) {
  const paper = PAPER_DIMENSIONS[paperSize];

  return orientation === "portrait"
    ? { width: paper.width, height: paper.height }
    : { width: paper.height, height: paper.width };
}

function ToolButton({
  label,
  children,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="size-8 shrink-0"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export default function DocumentEditor() {
  const [settings, setSettings] = useState<DocumentSettings>({
    paperSize: "A4",
    orientation: "portrait",
    layout: "single",
  });

  // Forces toolbar state to refresh when the selection or document changes.
  const [, setEditorRevision] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start writing your document...",
      }),
      Image,
      DocumentColumns,
      DocumentColumn,
    ],
    content: `
      <h1>Untitled document</h1>
      <p>Start building your document here. Your text is editable, and the toolbar controls the formatting.</p>
      <h2>Introduction</h2>
      <p>Use this area to write your introduction. Change the paper size, orientation, and column layout from the sidebar.</p>
      <h2>Main content</h2>
      <p>Add paragraphs, headings, lists, and images as needed. Reusable document sections and automatic pagination will be added in subsequent steps.</p>
    `,
    onUpdate: () => {
      setEditorRevision((revision) => revision + 1);
    },
    onSelectionUpdate: () => {
      setEditorRevision((revision) => revision + 1);
    },
    editorProps: {
      attributes: {
        class: "tiptap",
        spellcheck: "true",
        "aria-label": "Document content editor",
      },
    },
  });

  const insertColumns = () => {
    if (!editor) return;

    if (settings.layout === "single") {
      editor
        .chain()
        .focus()
        .insertContent({ type: "paragraph" })
        .run();

      return;
    }

    const fourColumnSection = {
      type: "documentColumns",
      content: Array.from({ length: 4 }, () => ({
        type: "documentColumn",
        content: [{ type: "paragraph" }],
      })),
    };

    editor
      .chain()
      .focus()
      .insertContent([
        fourColumnSection,
        { type: "paragraph" },
      ])
      .run();
  };

  const dimensions = useMemo(
    () =>
      getPageDimensions(settings.paperSize, settings.orientation),
    [settings.paperSize, settings.orientation],
  );

  const updateSettings = (
    patch: Partial<DocumentSettings>,
  ) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const activeBlockStyle: BlockStyle = !editor
    ? "paragraph"
    : editor.isActive("heading", { level: 1 })
      ? "heading1"
      : editor.isActive("heading", { level: 2 })
        ? "heading2"
        : editor.isActive("heading", { level: 3 })
          ? "heading3"
          : "paragraph";

  const applyBlockStyle = (value: string) => {
    if (!editor) return;

    const chain = editor.chain().focus();

    switch (value as BlockStyle) {
      case "heading1":
        chain.toggleHeading({ level: 1 }).run();
        break;
      case "heading2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "heading3":
        chain.toggleHeading({ level: 3 }).run();
        break;
      default:
        chain.setParagraph().run();
    }
  };

  const insertImage = () => {
    if (!editor) return;

    const src = window.prompt("Enter an image URL:");
    if (!src?.trim()) return;

    try {
      const url = new URL(src.trim());

      if (!["http:", "https:"].includes(url.protocol)) {
        window.alert("Please enter a valid HTTP or HTTPS image URL.");
        return;
      }

      editor
        .chain()
        .focus()
        .setImage({ src: url.href, alt: "Document image" })
        .run();
    } catch {
      window.alert("Please enter a valid image URL.");
    }
  };

  const wordCount = editor
    ? editor
      .getText()
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
    : 0;

  return (
    <div className="document-editor">
      <header className="document-header flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-5" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              Document Studio
            </h1>
            <p className="text-xs text-muted-foreground">
              Untitled document
            </p>
          </div>
        </div>

        <Button type="button" size="sm" variant="outline" disabled>
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </header>

      {/* Formatting toolbar */}
      <div className="document-toolbar flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b bg-background px-3 py-1.5">
        <Select
          value={activeBlockStyle}
          onValueChange={applyBlockStyle}
          disabled={!editor}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="heading1">Heading 1</SelectItem>
            <SelectItem value="heading2">Heading 2</SelectItem>
            <SelectItem value="heading3">Heading 3</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton
          label="Undo"
          disabled={!editor || !editor.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={!editor || !editor.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton
          label="Bold"
          active={!!editor?.isActive("bold")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={!!editor?.isActive("italic")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="Underline"
          active={!!editor?.isActive("underline")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton
          label="Align left"
          active={!!editor?.isActive({ textAlign: "left" })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft />
        </ToolButton>
        <ToolButton
          label="Align center"
          active={!!editor?.isActive({ textAlign: "center" })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter />
        </ToolButton>
        <ToolButton
          label="Align right"
          active={!!editor?.isActive({ textAlign: "right" })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight />
        </ToolButton>

        <ToolButton
          label="Bulleted list"
          active={!!editor?.isActive("bulletList")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={!!editor?.isActive("orderedList")}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton
          label="Insert image"
          disabled={!editor}
          onClick={insertImage}
        >
          <ImagePlus />
        </ToolButton>

        <ToolButton
          label={`Insert editable columns`}
          disabled={!editor}
          onClick={insertColumns}
        >
          <Columns3 />
        </ToolButton>
      </div>

      <div className="document-workspace">
        <aside className="document-sidebar">
          <div>
            <h2 className="text-sm font-semibold">Page layout</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure the document canvas.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Paper size</label>
            <Select
              value={settings.paperSize}
              onValueChange={(value) =>
                updateSettings({ paperSize: value as PaperSize })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4 — 210 × 297 mm</SelectItem>
                <SelectItem value="A3">A3 — 297 × 420 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Orientation</label>
            <Select
              value={settings.orientation}
              onValueChange={(value) =>
                updateSettings({ orientation: value as Orientation })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Column layout</label>
            <Select
              value={settings.layout}
              onValueChange={(value: ColumnLayout) =>
                setSettings((current) => ({
                  ...current,
                  layout: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose layout" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="single">Single column</SelectItem>
                <SelectItem value="four">Four columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Page details</h3>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Width</span>
              <span>{dimensions.width} mm</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Height</span>
              <span>{dimensions.height} mm</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Columns</span>
            </div>
          </div>
        </aside>

        <main
          className="document-canvas"
          style={
            { "--page-width": `${dimensions.width}mm` } as CSSProperties
          }
        >
          <div className="document-canvas-heading">
            <span>
              {settings.paperSize} · {settings.orientation}
            </span>
            <span>columns</span>
          </div>

          <article
            className="document-page"
            style={
              {
                "--page-width": `${dimensions.width}mm`,
                "--page-height": `${dimensions.height}mm`,
              } as CSSProperties
            }
          >
            <div className="document-page-content">
              <EditorContent editor={editor} />
            </div>

            <footer className="document-statusbar flex h-8 shrink-0 items-center justify-between border-t bg-background px-4 text-xs text-muted-foreground">
              <span>Document Studio</span>
              <span>1</span>
            </footer>
          </article>
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-background px-4 text-xs text-muted-foreground">
        <span>{wordCount} words</span>
        <span>
          {settings.paperSize} · {settings.orientation} · columns
        </span>
      </footer>
    </div>
  );
}
