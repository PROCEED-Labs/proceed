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
) => {
  return <Dropdown menu={{ items }}>{getButton(label)}</Dropdown>;
};

const getAddButton = (
  label: string,
  items: {
    key: string;
    label: string;
  }[] = [],
) => {
  if (items.length > 0) {
    return getDropdown(label, items);
  }
  return getButton(label);
};

export default getAddButton;
