import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";

export function ContentEditable({
  placeholder,
}: {
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <LexicalContentEditable className="relative block h-48 min-h-48 overflow-auto px-4 py-2 focus:outline-none" />
      {placeholder && (
        <div className="pointer-events-none absolute left-4 top-2 select-none text-muted-foreground">
          {placeholder}
        </div>
      )}
    </div>
  );
}
