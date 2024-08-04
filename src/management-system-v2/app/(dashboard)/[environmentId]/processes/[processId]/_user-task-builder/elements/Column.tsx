import { UserComponent, useNode } from '@craftjs/core';
import { useDraggable } from '@dnd-kit/core';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFrame } from 'react-frame-component';
import useBuilderStateStore from '../use-builder-state-store';

const Column: UserComponent<React.PropsWithChildren<{ fixed?: boolean }>> = ({
  children,
  fixed,
}) => {
  const {
    connectors: { connect, drag },
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

  const ref = useRef<HTMLDivElement>();
  const frame = useFrame();

  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
  } = useDraggable({
    id: nodeId,
    disabled: fixed || isTextEditing,
  });

  return (
    <>
      <div
        id={nodeId}
        ref={(r) => {
          ref.current = r || undefined;
          r && connect(r);
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
