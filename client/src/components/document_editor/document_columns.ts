
import { Node, mergeAttributes } from "@tiptap/core";

export const DocumentColumns = Node.create({
  name: "documentColumns",
  group: "block",

  // Every section must contain exactly four columns.
  content:
    "documentColumn documentColumn documentColumn documentColumn",

  defining: true,
  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="document-columns"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "document-columns",
      }),
      0,
    ];
  },
});

export const DocumentColumn = Node.create({
  name: "documentColumn",
  content: "block*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="document-column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "document-column",
      }),
      0,
    ];
  },
});
