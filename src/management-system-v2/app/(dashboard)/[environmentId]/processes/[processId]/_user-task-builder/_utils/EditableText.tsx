import React, { ReactNode, SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import useBuilderStateStore from '../use-builder-state-store';
import { SerializedNode, useEditor } from '@craftjs/core';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  $getRoot,
  $createParagraphNode,
  $isElementNode,
  $isDecoratorNode,
  ParagraphNode,
  NodeKey,
  EditorConfig,
  LexicalEditor,
  ElementNode,
} from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LinkNode } from '@lexical/link';
import ToolbarPlugin from './ToolbarPlugin';

import CustomContentEditable from './ContentEditable';
import { $createSpanNode, SpanNode } from './SpanNode';
import CustomLinkPlugin from './CustomLinkPlugin';

type EditableTextProps = Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'tagName'> & {
  value: string;
  onChange: (newText: string) => void;
  tagName: string;
  htmlFor?: string;
};

const ToggleEditablePlugin: React.FC<{
  editing: boolean;
  onChange: (newText: string) => void;
}> = ({ editing, onChange }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      if (editor.isEditable() && !editing) {
        const newText = $generateHtmlFromNodes(editor, null);
        onChange(newText);
      }
    });

    editor.setEditable(editing);
  }, [editing, editor, onChange]);

  return null;
};

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
          root = $createSpanNode();
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

const theme = {
  text: {
    bold: 'text-style-bold',
    italic: 'text-style-italic',
    underline: 'text-style-underline',
  },
};

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  tagName,
  ...props
}) => {
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  const selectingText = useRef(false);

  const [editing, setEditing] = useState(false);

  const iframe = useBuilderStateStore((state) => state.iframe);
  const setIsTextEditing = useBuilderStateStore((state) => state.setIsTextEditing);

  useEffect(() => {
    if (!editingEnabled) {
      setEditing(false);
      setIsTextEditing(false);
    }
  }, [editingEnabled]);

  useEffect(() => {
    const handleClick = () => {
      if (!selectingText.current) {
        // when not selecting text disable this element when the mouse is released outside of it
        setEditing(false);
        setIsTextEditing(false);
      } else {
        selectingText.current = false;
      }
    };
    iframe?.contentWindow?.addEventListener('click', handleClick);
    return () => {
      iframe?.contentWindow?.removeEventListener('click', handleClick);
    };
  }, [iframe, onChange]);

  const toolbar = editing
    ? createPortal(
        <ToolbarPlugin />,
        document.getElementById('text-editable-toolbar') || document.createDocumentFragment(),
      )
    : null;

  const initialConfig = {
    namespace: 'My Editor',
    onError: (err: Error) => {
      throw err;
    },
    editable: false,
    nodes: [HeadingNode, LinkNode, SpanNode],
    theme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        onMouseDownCapture={(e) => {
          if (editing) {
            e.stopPropagation();
            selectingText.current = true;
          }
        }}
        onClick={(e) => !editing && !e.ctrlKey && e.preventDefault()}
        onDoubleClick={() => {
          if (editingEnabled && !editing) {
            setEditing(true);
            setIsTextEditing(true);
          }
        }}
        onKeyDownCapture={(e) => {
          if (editing && !e.shiftKey && e.key === 'Enter') {
            setEditing(false);
            setIsTextEditing(false);
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        {...props}
      >
        <RichTextPlugin
          contentEditable={<CustomContentEditable tagName={tagName} />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <CustomLinkPlugin />
        <ImportIntoEditorPlugin value={value} />
        <ToggleEditablePlugin editing={editing} onChange={onChange} />
      </div>
      {toolbar}
    </LexicalComposer>
  );
};
