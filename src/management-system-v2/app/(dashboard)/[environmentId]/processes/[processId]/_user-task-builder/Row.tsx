import { UserComponent, useNode } from '@craftjs/core';

const Row: UserComponent<React.PropsWithChildren> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div ref={(r) => connect(r)} className="user-task-form-row">
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
