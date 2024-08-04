import { UserComponent, useNode } from '@craftjs/core';
import { useDroppable } from '@dnd-kit/core';

const Row: UserComponent<React.PropsWithChildren> = ({ children }) => {
  const {
    connectors: { connect },
    nodeId,
  } = useNode((node) => {
    return { nodeId: node.id };
  });

  const { setNodeRef } = useDroppable({ id: nodeId });

  return (
    <div
      id={nodeId}
      ref={(r) => {
        r && connect(r);
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
