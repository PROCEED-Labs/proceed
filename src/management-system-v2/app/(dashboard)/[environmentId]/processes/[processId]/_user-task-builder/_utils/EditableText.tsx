import React, { useEffect, useRef, useState, JSX } from 'react';

import { useEditor } from '@craftjs/core';

import { useFrame } from 'react-frame-component';

import LexicalTextEditor, { TextEditorRef } from './lexical-text-editor';

type EditableTextProps<T extends keyof JSX.IntrinsicElements> = Omit<
  JSX.IntrinsicElements[T],
  'onChange' | 'value'
> & {
  value: string;
  onChange: (newText: string) => void;
  tagName: T;
};

function EditableText<T extends keyof JSX.IntrinsicElements>({
  value,
  onChange,
  tagName,
  ...props
}: EditableTextProps<T>) {
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));
  const [active, setActive] = useState(false);

  const selectingText = useRef(false);
  const editorRef = useRef<TextEditorRef>(null);

  const frame = useFrame();

  useEffect(() => {
    if (!editingEnabled) {
      setActive(false);
    }
  }, [editingEnabled]);

  useEffect(() => {
    const handleClick = async () => {
      if (!selectingText.current) {
        // when not selecting text disable this element when the mouse is released outside of it
        if (editorRef.current) {
          onChange(await editorRef.current.getCurrentValue());
        }
        setActive(false);
      } else {
        selectingText.current = false;
      }
    };
    frame.window?.addEventListener('click', handleClick);
    return () => {
      frame.window?.removeEventListener('click', handleClick);
    };
  }, [frame, onChange]);

  return (
    <>
      {active ? (
        <LexicalTextEditor
          value={value}
          disabled={!editingEnabled}
          ref={editorRef}
          EditableElement={React.forwardRef(({ contentEditable }, editableRef) => {
            return React.createElement(tagName, {
              contentEditable,
              ref: editableRef,
              onKeyDownCapture: async (e: KeyboardEvent) => {
                if (!e.shiftKey && e.key === 'Enter') {
                  if (editorRef.current) {
                    onChange(await editorRef.current.getCurrentValue());
                  }
                  setActive(false);
                  e.stopPropagation();
                  e.preventDefault();
                }
              },
              onMouseDownCapture: (e: MouseEvent) => {
                e.stopPropagation();
                selectingText.current = true;
              },
              ...props,
            });
          })}
        />
      ) : (
        React.createElement(tagName, {
          dangerouslySetInnerHTML: { __html: value },
          onDoubleClick: () => {
            if (editingEnabled) {
              setActive(true);
            }
          },
          onClick: (e: MouseEvent) => !e.ctrlKey && e.preventDefault(),
          ...props,
        })
      )}
    </>
  );
}

export default EditableText;
