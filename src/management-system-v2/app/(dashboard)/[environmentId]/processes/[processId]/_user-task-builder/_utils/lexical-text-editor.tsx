import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle, useId } from 'react';

import { createPortal } from 'react-dom';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $getRoot, $isElementNode, ElementNode, $createParagraphNode } from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LinkNode } from '@lexical/link';
import ToolbarPlugin from './ToolbarPlugin';

import CustomContentEditable, { CustomContentEditableProps } from './ContentEditable';
import CustomLinkPlugin from './CustomLinkPlugin';
import useBuilderStateStore from '../use-builder-state-store';

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

const theme = {
  // disabling some default stylings for elements; otherwise it would not be possible to change these styles (e.g bold header and underlined links)
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
  // adding our styling
  text: {
    bold: 'text-style-bold',
    italic: 'text-style-italic',
    underline: 'text-style-underline',
  },
};

type EditorProps = CustomContentEditableProps & {
  value: string;
  disabled: boolean;
};

const LexicalTextEditor = forwardRef<TextEditorRef, EditorProps>(
  ({ value, disabled, ...contentEditableProps }, ref) => {
    const setIsTextEditing = useBuilderStateStore((state) => state.setIsTextEditing);

    const id = useId();
    const blockDragging = useBuilderStateStore((state) => state.blockDragging);
    const unblockDragging = useBuilderStateStore((state) => state.unblockDragging);

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
        nodes: [HeadingNode, LinkNode],
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
          <CustomLinkPlugin />
          <ImportIntoEditorPlugin value={value} />
          <ToggleEditablePlugin disabled={disabled} />
          <ImperativeHandlePlugin ref={ref} />
        </div>
        {toolbarTarget && createPortal(<ToolbarPlugin />, toolbarTarget)}
      </LexicalComposer>
    );
  },
);

export default LexicalTextEditor;
