import React, { useEffect } from 'react';
import { useFrame } from 'react-frame-component';
import useEditorControls from './use-editor-controls';
import { useAddControlCallback } from '@/lib/controls-store';
import AddUserControls from '@/components/add-user-controls';
import useBuilderStateStore from './use-builder-state-store';

type ShortcutHandlerProps = {
  onClose?: () => void;
};

const ShortcutHandler: React.FC<ShortcutHandlerProps> = ({ onClose }) => {
  const { document } = useFrame();

  const { selected, deleteElement, canUndo, canRedo, undo, redo } = useEditorControls();

  const isTextEditing = useBuilderStateStore((state) => state.isTextEditing);

  useEffect(() => {
    if (document && !isTextEditing) {
      // handle events that are only thrown inside the iframe and cannot be handled by react
      // handlers
      const onDelete = (e: KeyboardEvent) => {
        if (selected && e.key === 'Delete') {
          deleteElement(selected);
        }
      };
      document.body.addEventListener('keydown', onDelete);

      const onEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose?.();
        }
      };
      document.body.addEventListener('keydown', onEscape);

      const onUndo = (e: KeyboardEvent) => {
        if (canUndo && e.ctrlKey && e.key === 'z') undo();
      };
      document.body.addEventListener('keydown', onUndo);

      const onRedo = (e: KeyboardEvent) => {
        if (canRedo && e.ctrlKey && e.key === 'y') redo();
      };
      document.body.addEventListener('keydown', onRedo);

      return () => {
        document.body.removeEventListener('keydown', onDelete);
        document.body.removeEventListener('keydown', onEscape);
        document.body.removeEventListener('keydown', onUndo);
        document.body.removeEventListener('keydown', onRedo);
      };
    }
  }, [document, selected, onClose, isTextEditing, canUndo, canRedo, undo, redo]);

  // handle events thrown outside the iframe
  useAddControlCallback(
    'html-editor',
    'del',
    () => {
      if (selected) {
        deleteElement(selected);
      }
    },
    { dependencies: [selected] },
  );

  useAddControlCallback(
    'html-editor',
    'undo',
    () => {
      if (canUndo) undo();
    },
    { dependencies: [canUndo, undo] },
  );

  useAddControlCallback(
    'html-editor',
    'redo',
    () => {
      if (canRedo) redo();
    },
    { dependencies: [canRedo, redo] },
  );

  return <AddUserControls name="html-editor" />;
};

export default ShortcutHandler;
