
import type { Editor } from "@tiptap/react";
import {
  Bold,
  FileCode,
  Italic,
  Underline,
  ImagePlus,
} from "lucide-react";

import ToolButton from "@/components/ui/toolbutton";
import type { DocumentSettings, PaperSize, Orientation } from "./document_types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type EditorState = {
  headingLevel: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
};

type EditorToolbarProps = {
  editor: Editor;
  editorState: EditorState;
  settings: DocumentSettings;
  updateSettings: (settings: Partial<DocumentSettings>) => void;
};

export function EditorToolbar({
  editor,
  editorState,
  settings,
  updateSettings,
}: EditorToolbarProps) {

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 rounded-t-lg border-b bg-background/95 p-2 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* Text Style */}
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
                level: Number(value!.slice(1)) as 1 | 2 | 3,
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

      {/* Text Formatting */}
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

      {/* Paper Size */}
      <Select
        value={settings.paperSize}
        onValueChange={(value) =>
          updateSettings({ paperSize: value as PaperSize })
        }
      >
        <SelectTrigger className="w-24">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="A4">A4</SelectItem>
          <SelectItem value="A3">A3</SelectItem>
        </SelectContent>
      </Select>

      {/* Orientation */}
      <Select
        value={settings.orientation}
        onValueChange={(value) =>
          updateSettings({ orientation: value as Orientation })
        }
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

      {/* NEW: Insert an image from a URL or a local file. */}
      <div className="flex items-center gap-1">
        <ToolButton
          label="Insert image from URL"
          onClick={() => {
            const url = window.prompt("Enter the image URL:");
            if (!url?.trim()) return;

            // NEW: Insert the image as a real Tiptap image node.
            editor
              .chain()
              .focus()
              .setImage({ src: url.trim(), alt: "Document image" })
              .run();
          }}
        >
          <ImagePlus className="size-4" />
        </ToolButton>

        {/* NEW: Local image picker; base64 is used for this prototype. */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="document-image-upload"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            // NEW: Convert the selected image to a data URL before insertion.
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result !== "string") return;

              editor
                .chain()
                .focus()
                .setImage({
                  src: reader.result,
                  alt: file.name,
                })
                .run();
            };
            reader.readAsDataURL(file);

            // NEW: Allow selecting the same file again later.
            event.target.value = "";
          }}
        />

        <ToolButton
          label="Upload image"
          onClick={() =>
            document.getElementById("document-image-upload")?.click()
          }
        >
          <ImagePlus className="size-4" />
        </ToolButton>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View JSON */}
      <ToolButton
        label="View JSON"
        className="ml-auto size-8 shrink-0"
        onClick={() => {
          const json = editor.getJSON();
          console.log("Editor JSON:", json);
          alert(JSON.stringify(json, null, 2));
        }}
      >
        <FileCode className="size-4" />
      </ToolButton>
    </div>
  );
}