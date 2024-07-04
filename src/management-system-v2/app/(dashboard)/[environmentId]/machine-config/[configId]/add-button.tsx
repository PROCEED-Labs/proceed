import { Button, Dropdown, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const getButton = (label: string) => {
  return (
    <Button>
      <Space>
        {label}
        <PlusOutlined
          style={{
            margin: '0 0 0 6px',
          }}
        />
      </Space>
    </Button>
  );
};

const getDropdown = (
  label: string,
  items: {
    key: string;
    label: string;
  }[],
  onClickHandle: any,
) => {
  return <Dropdown menu={{ items, onClick: onClickHandle }}>{getButton(label)}</Dropdown>;
};

const getAddButton = (
  label: string,
  items: {
    key: string;
    label: string;
  }[] = [],
  onClickHandle: any,
) => {
  if (items.length > 0) {
    return getDropdown(label, items, onClickHandle);
  }
  return getButton(label);
};

export default getAddButton;
