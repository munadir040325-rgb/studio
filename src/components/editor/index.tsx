"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $generateHtmlFromNodes } from "@lexical/html";
import { EditorState, LexicalEditor } from "lexical";
import { Toolbar } from "./toolbar";
import { editorConfig } from "./config";
import { ContentEditable } from "./content-editable";

interface RichTextEditorProps {
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  onChange,
  placeholder,
}: RichTextEditorProps) {

  const handleOnChange = (editorState: EditorState, editor: LexicalEditor) => {
    editor.update(() => {
      const html = $generateHtmlFromNodes(editor, null);
      onChange(html);
    });
  };

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="w-full overflow-hidden rounded-lg border mt-2">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable placeholder={placeholder} />}
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={null}
          />
          <ListPlugin />
          <OnChangePlugin onChange={handleOnChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}
