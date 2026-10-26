import { Mark } from "@tiptap/core";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

/** The red emphasis (span.important) the Word files use: kept so existing text keeps its look. */
export const Important = Mark.create({
  name: "important",
  parseHTML: () => [{ tag: "span.important" }],
  renderHTML: () => ["span", { class: "important" }, 0],
});

// StarterKit already has bold, italic, underline, links, lists, headings and line breaks.
export const extensions = [
  StarterKit,
  TextStyle,
  Color,
  FontSize,
  Important,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Table,
  TableRow,
  TableHeader,
  TableCell,
];
