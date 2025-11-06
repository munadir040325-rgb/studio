"use client";

import {
  useBlockNote,
} from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/react/style.css";

interface EditorProps {
  onContentChange: (html: string) => void;
}

export function Editor({ onContentChange }: EditorProps) {
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
  });

  if (!editor) {
    return "Loading Editor...";
  }

  // Renders the editor instance using a React component.
  return (
    <div className="w-full relative border rounded-md">
        <div className="min-h-[10rem] w-full p-2 focus:outline-none">
          {editor && <editor.BlockNoteView editor={editor} />}
        </div>
    </div>
  );
}
