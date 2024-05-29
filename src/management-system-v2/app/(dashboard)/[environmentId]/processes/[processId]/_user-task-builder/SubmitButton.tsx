import { Row, Typography, Select } from 'antd';

import { useNode, UserComponent } from '@craftjs/core';

type SubmitButtonProps = React.PropsWithChildren & {
  size?: 'large' | 'middle' | 'small';
  type?: 'primary' | 'default' | 'danger';
};

const SubmitButton: UserComponent<SubmitButtonProps> = ({ children }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <button type="submit" className="user-task-form-button" ref={(r) => connect(r)}>
      {children}
    </button>
  );
};

SubmitButton.craft = {
  rules: {
    canDrag: () => false,
  },
};

export default SubmitButton;
