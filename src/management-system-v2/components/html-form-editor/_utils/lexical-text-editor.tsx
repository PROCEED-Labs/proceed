import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle, useId } from 'react';

import { createPortal } from 'react-dom';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  $getRoot,
  $isElementNode,
  ElementNode,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_SPACE_COMMAND,
} from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LinkNode } from '@lexical/link';
import ToolbarPlugin from './ToolbarPlugin';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import CustomContentEditable, { CustomContentEditableProps } from './ContentEditable';
import CustomLinkPlugin from './CustomLinkPlugin';
import useEditorStateStore from '../use-editor-state-store';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';

import { ListNode, ListItemNode } from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';

// Plugin to clean up markdown delimiters after transformation
const CleanupMarkdownPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const cleanupDelimiters = () => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        const parent = anchorNode.getParent();

        // Try to remove any text nodes that are only a markdown characters (with optional space)
        if (parent) {
          const children = parent.getChildren();
          children.forEach((child) => {
            if ($isTextNode(child)) {
              const text = child.getTextContent();
              // Match markdown characters followed by optional space
              if (/^[\*`_]+ ?$/.test(text)) {
                console.log('Removing node with text:', text);
                child.remove();
              }
            }
          });
        }
      });
    };

    const removeSpace = editor.registerCommand(
      KEY_SPACE_COMMAND,
      () => {
        setTimeout(cleanupDelimiters, 100);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        setTimeout(cleanupDelimiters, 100);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removeSpace();
      removeEnter();
    };
  }, [editor]);

  return null;
};

const ToggleEditablePlugin: React.FC<{
  disabled: boolean;
}> = ({ disabled }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  return null;
};

// import the initial value into the editor; afterwards the editor will handle the value itself and it will not be reimported on change
const ImportIntoEditorPlugin: React.FC<{ value: string }> = ({ value }) => {
  const [editor] = useLexicalComposerContext();

  const [importDone, setImportDone] = useState(false);

  useEffect(() => {
    if (editor && !importDone) {
      setImportDone(true);
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        $getRoot().clear();
        let root: ElementNode;
        if (nodes.some((node) => !$isElementNode(node))) {
          root = $createParagraphNode();
          $getRoot().append(root);
        } else root = $getRoot();

        nodes.forEach((node) => {
          root.append(node);
        });
      });
    }
  }, [editor, importDone]);

  return null;
};

export interface TextEditorRef {
  getCurrentValue: () => Promise<string>;
}
// exposing functionality of the editor to the parent component
const ImperativeHandlePlugin = forwardRef<TextEditorRef, {}>((_, ref) => {
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(ref, () => ({
    getCurrentValue: () => {
      return new Promise((resolve) => {
        editor.update(() => {
          resolve($generateHtmlFromNodes(editor, null));
        });
      });
    },
  }));

  return null;
});

ImperativeHandlePlugin.displayName = 'ImperativeHandlePlugin';

const theme = {
  // disabling some default stylings for elements
  paragraph: 'text-style-paragraph',
  heading: {
    h1: 'text-style-heading',
    h2: 'text-style-heading',
    h3: 'text-style-heading',
    h4: 'text-style-heading',
    h5: 'text-style-heading',
    h6: 'text-style-heading',
  },
  link: 'text-style-link',
  list: {
    ul: 'text-style-list-ul',
    ol: 'text-style-list-ol',
    listitem: 'text-style-listitem',
  },
  quote: 'text-style-quote',
  code: 'text-style-code',
  // adding our styling
  text: {
    bold: 'text-style-bold',
    italic: 'text-style-italic',
    underline: 'text-style-underline',
    code: 'text-style-inline-code',
  },
};

type EditorProps = CustomContentEditableProps & {
  value: string;
  disabled: boolean;
};

const LexicalTextEditor = forwardRef<TextEditorRef, EditorProps>(
  ({ value, disabled, ...contentEditableProps }, ref) => {
    const setIsTextEditing = useEditorStateStore((state) => state.setIsTextEditing);

    const id = useId();
    const blockDragging = useEditorStateStore((state) => state.blockDragging);
    const unblockDragging = useEditorStateStore((state) => state.unblockDragging);

    useEffect(() => {
      // signal that we started editing text on mount
      setIsTextEditing(true);
      blockDragging(id);

      return () => {
        // signal the end of text editing on unmount
        setIsTextEditing(false);
        unblockDragging(id);
      };
    }, []);

    const initialConfig = useMemo(() => {
      return {
        namespace: 'My Editor',
        onError: (err: Error) => {
          throw err;
        },
        editable: !disabled,
        nodes: [
          HeadingNode,
          LinkNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          CodeHighlightNode,
        ],
        theme,
      };
    }, []);

    // the toolbar is supposed to be rendered into the sidebar that is outside the enclosing iframe
    const toolbarTarget = document.getElementById('text-editable-toolbar');

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div>
          <RichTextPlugin
            contentEditable={<CustomContentEditable {...contentEditableProps} />}
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <CustomLinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <CleanupMarkdownPlugin />
          <ImportIntoEditorPlugin value={value} />
          <ToggleEditablePlugin disabled={disabled} />
          <ImperativeHandlePlugin ref={ref} />
        </div>
        {toolbarTarget && createPortal(<ToolbarPlugin />, toolbarTarget)}
      </LexicalComposer>
    );
  },
);

LexicalTextEditor.displayName = 'LexicalTextEditor';

export default LexicalTextEditor;
