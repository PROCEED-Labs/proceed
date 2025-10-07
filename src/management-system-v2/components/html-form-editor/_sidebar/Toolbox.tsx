import React, { ReactNode } from 'react';

import { Button as AntButton } from 'antd';

import { useDraggable } from '@dnd-kit/core';

import styles from './index.module.scss';

import Column from '../elements/Column';

import { createPortal } from 'react-dom';
import { useCanEdit } from '@/lib/can-edit-context';

type CreationButtonProps = React.PropsWithChildren<{
  title: string;
  icon: ReactNode;
}>;

export type ToolboxEntry = {
  title: string;
  icon: ReactNode;
  element: ReactNode;
};
export type ToolboxEntries = ToolboxEntry[];

export type ToolboxProps = {
  entries: ToolboxEntries;
};

const CreationButton: React.FC<CreationButtonProps> = ({ children, title, icon }) => {
  const editingEnabled = useCanEdit();

  const id = `create-${title}-button`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      element: <Column>{children}</Column>,
    },
  });

  return (
    <>
      <AntButton
        id={id}
        className={styles.CreationButton}
        disabled={!editingEnabled}
        ref={setNodeRef}
        icon={icon}
        {...attributes}
        {...listeners}
      >
        {title}
      </AntButton>
      {isDragging &&
        /** We want to render the indicator into the overlay that is set up in the CustomDnD component */
        document.getElementById('dnd-drag-overlay') &&
        createPortal(
          <AntButton className={styles.DraggedCreationButton} icon={icon}>
            {title}
          </AntButton>,
          document.getElementById('dnd-drag-overlay')!,
        )}
    </>
  );
};

const Toolbox: React.FC<ToolboxProps> = ({ entries }) => {
  return (
    <div className={styles.Toolbox}>
      {entries.map((entry) => (
        <CreationButton key={entry.title} title={entry.title} icon={entry.icon}>
          {entry.element}
        </CreationButton>
      ))}
    </div>
  );
};

export default Toolbox;
