import { UserComponent, useNode } from '@craftjs/core';
import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFrame } from 'react-frame-component';

const Column: UserComponent<React.PropsWithChildren<{ fixed?: boolean }>> = ({
  children,
  fixed,
}) => {
  const {
    connectors: { connect, drag },
    nodeId,
    isDragged,
    isHovered,
    isSelected,
  } = useNode((node) => ({
    nodeId: node.id,
    isDragged: node.events.dragged,
    isHovered: node.events.hovered,
    isSelected: node.events.selected,
  }));

  const ref = useRef<HTMLDivElement>();
  const frame = useFrame();

  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: nodeId,
    disabled: fixed,
  });

  return (
    <>
      <div
        id={nodeId}
        ref={(r) => {
          ref.current = r || undefined;
          r && connect(r);
          setNodeRef(r);
        }}
        className="user-task-form-column"
        style={{
          border: isSelected ? '2px solid #66f' : isHovered ? '2px dashed #66f' : undefined,
        }}
        {...attributes}
        {...listeners}
      >
        {children}
      </div>
      {isDragging &&
        frame.document?.getElementById('dnd-drag-overlay') &&
        createPortal(<div>{children}</div>, frame.document?.getElementById('dnd-drag-overlay')!)}
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
