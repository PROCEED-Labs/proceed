import { UserComponent, useNode } from '@craftjs/core';

const Column: UserComponent<React.PropsWithChildren<{ fixed?: boolean }>> = ({
  children,
  fixed = false,
}) => {
  const {
    connectors: { connect, drag },
    isDragged,
    isHovered,
    isSelected,
  } = useNode((node) => ({
    isDragged: node.events.dragged,
    isHovered: node.events.hovered,
    isSelected: node.events.selected,
  }));

  return (
    <div
      ref={(r) => connect(drag(r))}
      className="user-task-form-column"
      style={{
        opacity: isDragged ? 0.25 : undefined,
        border: isSelected ? '2px solid #66f' : isHovered ? '2px dashed #66f' : undefined,
      }}
    >
      {children}
    </div>
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
