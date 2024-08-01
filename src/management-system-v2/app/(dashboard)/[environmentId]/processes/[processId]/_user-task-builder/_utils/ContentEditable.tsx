import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

type CustomContentEditableProps = {
  tagName: string;
};

const CustomContentEditable: React.FC<CustomContentEditableProps> = ({ tagName }) => {
  const [editor] = useLexicalComposerContext();

  const [isEditable, setIsEditable] = useState(editor.isEditable());

  const makeEditorRoot = useCallback(
    (rootElement: HTMLElement | null) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );

  useLayoutEffect(() => {
    return editor.registerEditableListener((currentIsEditable) => {
      setIsEditable(currentIsEditable);
    });
  }, [editor]);

  useEffect(() => {
    if (isEditable) {
      const el = editor.getRootElement();
      const sel = el?.ownerDocument.getSelection();
      if (el && sel) {
        el.focus();
        const range = new Range();
        range.selectNodeContents(el);
        range.collapse();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [editor, isEditable]);

  return React.createElement(tagName, {
    contentEditable: isEditable,
    ref: makeEditorRoot,
  });
};

export default CustomContentEditable;
