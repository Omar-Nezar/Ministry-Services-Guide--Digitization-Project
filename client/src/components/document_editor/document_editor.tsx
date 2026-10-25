import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  PaperSize,
  Orientation,
  DocumentSettings,
} from "./document_types";
import Image from "@tiptap/extension-image";

import { Header } from "@/components/general/header";
import { EditorToolbar } from "./editor_toolbar";
import { AdvancedPageEditor } from "./advanced/AdvancedPageEditor";

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

  // Calculate the available writing area inside the paper margins.
  const pageStyle = useMemo(
    () =>
      ({
        width: `${dimensions.width}mm`,
        minHeight: `${dimensions.height}mm`,
        padding: "20mm",
        boxSizing: "border-box",
      }) as CSSProperties,
    [dimensions.width, dimensions.height],
  );

  const updateSettings = (
    patch: Partial<DocumentSettings>,
  ) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  // Enable image insertion and image resizing.
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          minWidth: 50,
          minHeight: 50,
          alwaysPreserveAspectRatio: true,
        },
      }),
    ],
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
    <div className="flex flex-col h-full">
      <Header
        links={[
          { href: "/moh", label: "Home", arabicLabel: "الصفحة الرئيسية" },
        ]}
      />

      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        editorState={editorState}
        settings={settings}
        updateSettings={updateSettings}
      />

      <main className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <div
          className="bg-white shadow-lg border rounded-sm transition-all duration-300 my-auto flex flex-col"
          style={pageStyle}
        >
          {/* Advanced Page Editor Integration */}
          <AdvancedPageEditor
            page={{
              id: 1,
              title: "Test Page",
              type: "columns",
              columns: [
                {
                  id: 1,
                  width: 50,
                  labelWidth: 30,
                  entries: [
                    { id: 1, columnId: 1, labelId: 1, order: 0, content: "" },
                  ],
                },
              ],
              imagePath: null,
              imageFit: "contain",
              caption: null,
            } as any}
            index={0}
            total={1}
            labels={[]}
            onPageChange={(p) => console.log("Page changed", p)}
            onMove={(dir) => console.log("Move", dir)}
            onDelete={() => console.log("Delete")}
          />
        </div>
      </main>
    </div>
  );
}
