import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";

export const editorConfig: InitialConfigType = {
  namespace: "report-editor",
  onError: (error) => console.error(error),
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
  theme: {
    ltr: "text-left",
    rtl: "text-right",
    paragraph: "mb-2",
    quote: "ml-4 border-l-4 border-muted-foreground pl-4 italic",
    heading: {
      h1: "text-2xl font-bold mb-4",
      h2: "text-xl font-semibold mb-3",
      h3: "text-lg font-semibold mb-2",
    },
    list: {
        ul: 'list-disc ml-6 mb-2',
        ol: 'list-decimal ml-6 mb-2',
    },
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
      strikethrough: "line-through",
      code: "font-mono bg-muted p-1 rounded-sm text-sm",
    },
  },
};
