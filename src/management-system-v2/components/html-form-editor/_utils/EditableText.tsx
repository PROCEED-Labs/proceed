import React, { useEffect, useRef, JSX } from 'react';

import { useEditor } from '@craftjs/core';

import { useFrame } from 'react-frame-component';

import LexicalTextEditor, { TextEditorRef } from './lexical-text-editor';

// using this type to deduce the correct props that are valid based on which tagname was given (e.g. htmlFor for labels or href for links)
type EditableTextProps<T extends keyof JSX.IntrinsicElements> = Omit<
  JSX.IntrinsicElements[T],
  'onChange' | 'value'
> & {
  value: string;
  active: boolean;
  onStopEditing?: () => void;
  onChange: (newText: string) => void;
  tagName: T;
};

function EditableText<T extends keyof JSX.IntrinsicElements>({
  value,
  active,
  onStopEditing,
  onChange,
  tagName,
  ...props
}: EditableTextProps<T>) {
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  const selectingText = useRef(false);
  const externalEditingStart = useRef(false);
  const editorRef = useRef<TextEditorRef>(null);

  const frame = useFrame();

  useEffect(() => {
    if (active) externalEditingStart.current = true;
  }, [active]);

  // if the editor is disabled make sure that this is also disabled
  useEffect(() => {
    if (!editingEnabled) {
      onStopEditing?.();
    }
  }, [editingEnabled]);

  useEffect(() => {
    const handleClick = async () => {
      if (!selectingText.current && !externalEditingStart.current) {
        // when not selecting text disable this element when the mouse is released outside of it
        if (editorRef.current) {
          const currentValue = await editorRef.current.getCurrentValue();
          await Promise.resolve(onChange(currentValue));
        }
        onStopEditing?.();
      } else {
        selectingText.current = false;
        externalEditingStart.current = false;
      }
    };
    frame.window?.addEventListener('click', handleClick);
    return () => {
      frame.window?.removeEventListener('click', handleClick);
    };
  }, [frame, onChange, onStopEditing]);

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
              onMouseDown: (e: MouseEvent) => {
                e.stopPropagation();
                selectingText.current = true;
              },
              onKeyDown: async (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();

                  if (editorRef.current) {
                    const currentValue = await editorRef.current.getCurrentValue();
                    await Promise.resolve(onChange(currentValue || ''));
                  }

                  onStopEditing?.();
                }
              },
              ...props,
            });
          })}
        />
      ) : (
        React.createElement(tagName, {
          dangerouslySetInnerHTML: { __html: value },
          onClick: (e: MouseEvent) => !(e.ctrlKey || e.metaKey) && e.preventDefault(),
          ...props,
        })
      )}
    </>
  );
}

export default EditableText;
