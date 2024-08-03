import { UserComponent, useNode } from '@craftjs/core';

import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

const Row: UserComponent<React.PropsWithChildren> = ({ children }) => {
  const {
    connectors: { connect },
    nodeId,
    nodeChildren,
  } = useNode((node) => {
    return { nodeId: node.id, nodeChildren: node.data.nodes };
  });

  return (
    <div
      id={nodeId}
      ref={(r) => {
        r && connect(r);
      }}
      className="user-task-form-row"
    >
      <SortableContext items={nodeChildren} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
};

Row.craft = {
  rules: {
    canDrag: () => false,
  },
};

export default Row;
