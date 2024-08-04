import React, { useCallback, useEffect, useLayoutEffect, useState, forwardRef } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $setSelection,
  $createRangeSelection,
  $createNodeSelection,
  $selectAll,
  $getSelection,
} from 'lexical';

export type CustomContentEditableProps = {
  EditableElement: ReturnType<
    typeof forwardRef<
      HTMLElement,
      {
        contentEditable: boolean;
      }
    >
  >;
};

const CustomContentEditable: React.FC<CustomContentEditableProps> = ({ EditableElement }) => {
  const [editor] = useLexicalComposerContext();

  const [isEditable, setIsEditable] = useState(editor.isEditable());

  // when this is mounted inside an editor make this element the root node of the editor for any text editing
  const makeEditorRoot = useCallback(
    (rootElement: HTMLElement | null) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );

  // this allows to disable the editor through the passed in prop
  useLayoutEffect(() => {
    return editor.registerEditableListener((currentIsEditable) => {
      setIsEditable(currentIsEditable);
    });
  }, [editor]);

  // TODO: set the caret at the end of the editor when it is mounted

  return <EditableElement contentEditable={isEditable} ref={makeEditorRoot} />;
};

export default CustomContentEditable;
