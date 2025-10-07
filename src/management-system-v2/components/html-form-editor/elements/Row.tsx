import { UserComponent, useNode } from '@craftjs/core';
import { useDroppable } from '@dnd-kit/core';

/**
 * This component encapsulates column component
 *
 * Every column needs to be inside a row and the can be multiple columns next to each other in a row
 */
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
