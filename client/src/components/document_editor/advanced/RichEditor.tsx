import { useEditor } from "@tiptap/react";
import { extensions } from "@/lib/tiptap";
import { cn } from "@/lib/utils";

export function RichEditor({ content, onChange }: { content: string; onChange: (json: string) => void }) {
  const editor = useEditor({
    extensions,
    content: content,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  if (!editor) return null;

  return (
    <div className="prose max-w-none focus:outline-none flex-1">
      <EditorContent editor={editor} />
    </div>
  );
}
