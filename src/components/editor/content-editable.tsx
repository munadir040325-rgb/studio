import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";

export function ContentEditable() {
  return (
    <div className="relative">
      <LexicalContentEditable className="relative block w-full h-full overflow-y-auto px-4 py-2 focus:outline-none" />
    </div>
  );
}
