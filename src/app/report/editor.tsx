"use client";

import { useMemo } from "react";
import {
  BlockNoteView,
  useBlockNote,
  lightDefaultTheme,
  Theme,
} from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";

// Custom theme to match app's aesthetic
const reportTheme = {
  ...lightDefaultTheme,
  fontFamily: "PT Sans, sans-serif",
  colors: {
    ...lightDefaultTheme.colors,
    editor: {
      text: "#111827", // foreground
      background: "#ffffff", // card
    },
    // You can customize other colors here if needed
    // e.g., blockquote, sideMenu, search, etc.
  },
} satisfies Theme;

interface EditorProps {
  onContentChange: (html: string) => void;
  onEditorMount: (editor: BlockNoteEditor) => void;
}

export function Editor({ onContentChange, onEditorMount }: EditorProps) {
  // Creates a new editor instance.
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      // Serializes the editor content to an HTML string.
      const saveContent = async () => {
        const html = await editor.blocksToHTMLLossy(editor.topLevelBlocks);
        onContentChange(html);
      };
      saveContent();
    },
    onEditorReady: (editor) => {
      onEditorMount(editor);
    }
  });

  if (!editor) {
    return "Loading Editor...";
  }

  // Renders the editor instance using a React component.
  return (
    <div className="w-full relative border rounded-md">
        <BlockNoteView
            editor={editor}
            theme={reportTheme}
            className="min-h-[10rem] w-full p-2 focus:outline-none"
        />
    </div>
  );
}
