import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";

export function ContentEditable() {
  return (
    <div className="relative">
      <LexicalContentEditable className="relative block h-32 min-h-32 overflow-auto px-4 py-2 focus:outline-none" />
    </div>
  );
}
