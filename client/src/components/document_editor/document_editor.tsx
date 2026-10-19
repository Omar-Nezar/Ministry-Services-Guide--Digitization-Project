import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Editor } from '@tiptap/core'
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { cn } from "@/lib/utils"

import { Header } from "@/components/general/header";

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
  Underline,
  FileCode
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PaperSize = "A4" | "A3";
type Orientation = "portrait" | "landscape";

type DocumentSettings = {
  paperSize: PaperSize;
  orientation: Orientation;
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
  className,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className={cn("size-8 shrink-0", className)}
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
  });


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

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Hello world! This is a simple Tiptap editor.</p>",
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      headingLevel: editor.isActive("heading")
        ? editor.getAttributes("heading").level
        : 0,
    }),
  });

  if (!editor) {
    return null;
  }

  return (
    <div>
      <Header
        links={[
          { href: "/moh", label: "Home", arabicLabel: "الصفحة الرئيسية" },
        ]}
      />
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-2 shadow-sm rounded-t-lg">
        <Select
          value={
            editorState.headingLevel
              ? `h${editorState.headingLevel}`
              : "paragraph"
          }
          onValueChange={(value) => {
            const chain = editor.chain().focus();

            if (value === "paragraph") {
              chain.setParagraph().run();
            } else {
              chain
                .setHeading({
                  level: Number(value.slice(1)) as 1 | 2 | 3,
                })
                .run();
            }
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        <ToolButton
          label="Bold"
          active={editorState.isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolButton>

        <ToolButton
          label="Italic"
          active={editorState.isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolButton>

        <ToolButton
          label="Underline"
          active={editorState.isUnderline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-4" />
        </ToolButton>

        <Separator orientation="vertical" className="h-6" />

        {/* Paper Size Selector */}
        <Select
          value={settings.paperSize}
          onValueChange={(value) => updateSettings({ paperSize: value as PaperSize })}
        >
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A4">A4</SelectItem>
            <SelectItem value="A3">A3</SelectItem>
          </SelectContent>
        </Select>

        {/* Orientation Selector */}
        <Select
          value={settings.orientation}
          onValueChange={(value) => updateSettings({ orientation: value as Orientation })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Orientation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        <ToolButton
          label="View JSON"
          className="ml-auto size-8 shrink-0"
          onClick={() => {
            const json = editor.getJSON();
            console.log("Editor JSON:", json);
            alert(JSON.stringify(json, null, 2)); // Or open a custom dialog preview
          }}
        >
          <FileCode className="size-4" />
        </ToolButton>
      </div>

      <main className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <div
          className="bg-white shadow-lg border rounded-sm transition-all duration-300 my-auto flex flex-col"
          style={{
            width: `${dimensions.width}mm`,
            minHeight: `${dimensions.height}mm`,
            padding: "20mm", // standard Word page margin
          }}
        >
          <EditorContent
            className="prose max-w-none focus:outline-none flex-1"
            editor={editor}
          />
        </div>
      </main>
    </div>
  );
}