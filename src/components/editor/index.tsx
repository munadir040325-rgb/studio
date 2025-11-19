"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/RichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $generateHtmlFromNodes } from "@lexical/html";
import { EditorState, LexicalEditor } from "lexical";
import { Toolbar } from "./toolbar";
import { editorConfig } from "./config";
import { ContentEditable } from "./content-editable";
import { cn } from "@/lib/utils";
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';

interface RichTextEditorProps {
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}

export function RichTextEditor({
  onChange,
  placeholder,
  minHeightClass
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
        <div className={cn("relative", minHeightClass)}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={
              <div className="pointer-events-none absolute left-4 top-2 select-none text-muted-foreground">
                {placeholder}
              </div>
            }
          />
          <ListPlugin />
          <OnChangePlugin onChange={handleOnChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}

    