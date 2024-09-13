import { UserComponent, useNode } from '@craftjs/core';
import { useDroppable } from '@dnd-kit/core';
import { useContext } from 'react';
import DragPreviewContext from '../_utils/drag-preview-context';

/**
 * This component encapsulates column component
 *
 * Every column needs to be inside a row and there can be multiple columns in a row
 */
const Row: UserComponent<React.PropsWithChildren> = ({ children }) => {
  const {
    connectors: { connect },
    nodeId,
  } = useNode((node) => {
    return { nodeId: node.id };
  });

  // prevent that a drag preview interacts with the drag and drop functionality of the original object
  const isDragPreview = useContext(DragPreviewContext);
  const droppableId = isDragPreview ? '' : nodeId;
  const { setNodeRef } = useDroppable({ id: droppableId });

  return (
    <div
      id={droppableId}
      ref={(r) => {
        !isDragPreview && r && connect(r);
        setNodeRef(r);
      }}
      className="user-task-form-row"
    >
      {children}
    </div>
  );
};

Row.craft = {
  rules: {
    canDrag: () => false,
  },
};

export default Row;
