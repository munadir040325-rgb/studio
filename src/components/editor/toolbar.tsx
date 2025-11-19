import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $isHeadingNode,
} from "@lexical/rich-text";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  mergeRegister,
} from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  List,
  ListOrdered,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ToolbarItem } from "./toolbar-item";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");


  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      // Check text formats
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));

      // Check block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && parent.getKey() === "root";
            });

      if (element === null) {
        return;
      }
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  return (
    <div className="sticky top-0 z-10 flex gap-1 overflow-auto border-b bg-background p-1">
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        active={isBold}
        label="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        active={isItalic}
        label="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        active={isUnderline}
        label="Underline"
      >
        <Underline className="h-4 w-4" />
      </ToolbarItem>
       <ToolbarItem
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        active={blockType === 'ul'}
        label="Bulleted List"
      >
        <List className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        active={blockType === 'ol'}
        label="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
        active={false}
        label="Outdent"
      >
        <Outdent className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
        active={false}
        label="Indent"
      >
        <Indent className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}
        active={false}
        label="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}
        active={false}
        label="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}
        active={false}
        label="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}
        active={false}
        label="Align Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarItem>
    </div>
  );
}
