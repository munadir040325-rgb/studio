import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  $setListType,
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
  const [listType, setListType] = useState<string | null>(null);


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
        setListType(null);
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
          
          // Get the specific list style type from the DOM element
          const listNode = parentList || element;
          const domNode = editor.getElementByKey(listNode.getKey());
          if (domNode) {
              setListType(domNode.getAttribute('type') || (type === 'ul' ? 'disc' : 'decimal'));
          }

        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
          setListType(null);
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

 const formatBulletList = () => {
    editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const listNode = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
        
        if (listNode && listNode.getListType() === 'ul') {
            const domElement = editor.getElementByKey(listNode.getKey());
            const currentType = domElement?.getAttribute('type');
            
            // Cycle through styles: disc -> circle -> square -> remove list
            if (currentType === 'disc' || !currentType) {
                domElement?.setAttribute('type', 'circle');
                setListType('circle');
            } else if (currentType === 'circle') {
                domElement?.setAttribute('type', 'square');
                setListType('square');
            } else if (currentType === 'square') {
                // To remove the list, we convert it back to paragraphs
                editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                setListType(null);
            }
        } else {
            // Not a UL or not a list at all, create a new one with default style
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            setListType('disc');
        }
    });
};

const formatNumberedList = () => {
    editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const listNode = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);

        if (listNode && listNode.getListType() === 'ol') {
            const domElement = editor.getElementByKey(listNode.getKey());
            const currentType = domElement?.getAttribute('type');

            // Cycle through styles: decimal -> lower-alpha -> lower-roman -> remove list
            if (currentType === '1' || !currentType) {
                domElement?.setAttribute('type', 'a'); // lower-alpha
                setListType('a');
            } else if (currentType === 'a') {
                domElement?.setAttribute('type', 'i'); // lower-roman
                setListType('i');
            } else if (currentType === 'i') {
                 // To remove the list, we convert it back to paragraphs
                editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                setListType(null);
            }
        } else {
             // Not an OL or not a list at all, create a new one
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            setListType('1');
        }
    });
};


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
        onClick={formatBulletList}
        active={blockType === 'ul'}
        label="Bulleted List"
      >
        <List className="h-4 w-4" />
      </ToolbarItem>
      <ToolbarItem
        onClick={formatNumberedList}
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
