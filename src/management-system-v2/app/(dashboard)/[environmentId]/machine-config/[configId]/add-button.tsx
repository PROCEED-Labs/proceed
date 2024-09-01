import { Button, Dropdown, Space, ButtonProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

type PlusButtonProps = {
  label: string;
  onClick: any;
};

const PlusButton: React.FC<ButtonProps & PlusButtonProps> = ({
  label,
  onClick,
  ...buttonProps
}) => {
  return (
    <Button onClick={onClick} {...buttonProps}>
      <Space>
        {label.length > 0 && label}
        <PlusOutlined
          style={{
            margin: label.length > 0 ? '0 0 0 6px' : '0',
          }}
        />
      </Space>
    </Button>
  );
};

type PlusDropDownProps = PlusButtonProps & {
  items?: {
    key: string;
    label: string;
  }[];
};

const PlusDropDown: React.FC<PlusDropDownProps> = ({ label, onClick, items }) => {
  return (
    <Dropdown menu={{ items, onClick: onClick }}>
      <PlusButton label={label} onClick={onClick} />
    </Dropdown>
  );
};

const AddButton: React.FC<PlusDropDownProps> = ({ label, onClick, items = [] }) => {
  if (items.length > 0) {
    return <PlusDropDown label={label} onClick={onClick} items={items} />;
  }
  return <PlusButton label={label} onClick={onClick} />;
};

export default AddButton;
