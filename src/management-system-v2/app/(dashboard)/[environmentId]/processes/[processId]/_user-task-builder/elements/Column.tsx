import { UserComponent, useNode } from '@craftjs/core';
import { useDraggable } from '@dnd-kit/core';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { useFrame } from 'react-frame-component';
import useBuilderStateStore from '../use-builder-state-store';
import DragPreviewContext from '../_utils/drag-preview-context';

/**
 * This component wraps every editor element provides drag handling and some styling
 */
const Column: UserComponent<React.PropsWithChildren<{ fixed?: boolean }>> = ({
  children,
  fixed,
}) => {
  const {
    connectors: { connect },
    nodeId,
    isHovered,
    isSelected,
  } = useNode((node) => ({
    nodeId: node.id,
    isDragged: node.events.dragged,
    isHovered: node.events.hovered,
    isSelected: node.events.selected,
  }));

  const isTextEditing = useBuilderStateStore((state) => state.isTextEditing);

  const frame = useFrame();

  // prevent that a drag preview interacts with the drag and drop functionality of the original object
  const isDragPreview = useContext(DragPreviewContext);
  const draggableId = isDragPreview ? '' : nodeId;
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
  } = useDraggable({
    id: draggableId,
    disabled: fixed || isTextEditing,
  });

  return (
    <>
      <div
        id={draggableId}
        ref={(r) => {
          !isDragPreview && r && connect(r);
          setDragNodeRef(r);
        }}
        className="user-task-form-column"
        style={{
          opacity: isDragging ? 0.25 : undefined,
          border: isSelected ? '2px solid #66f' : isHovered ? '2px dashed #66f' : undefined,
        }}
        {...attributes}
        {...listeners}
      >
        {children}
      </div>
      {/* We need to render the drag shadow of this element into the drag overlay that is portaled into the iframe by our CustomDnD component */}
      <DragPreviewContext.Provider value={true}>
        {isDragging &&
          frame.document?.getElementById('dnd-drag-overlay') &&
          createPortal(<div>{children}</div>, frame.document?.getElementById('dnd-drag-overlay')!)}
      </DragPreviewContext.Provider>
    </>
  );
};

Column.craft = {
  rules: {
    canDrag: (node) => !node.data.props.fixed,
    canMoveIn: () => false,
  },
  props: {
    fixed: false,
  },
};

export default Column;
