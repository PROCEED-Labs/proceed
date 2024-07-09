import { Button, Dropdown, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const getButton = (label: string, onClickHandle: any) => {
  return (
    <Button onClick={onClickHandle}>
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

const getDropdown = (
  label: string,
  items: {
    key: string;
    label: string;
  }[],
  onClickHandle: any,
) => {
  return (
    <Dropdown menu={{ items, onClick: onClickHandle }}>{getButton(label, onClickHandle)}</Dropdown>
  );
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
  return getButton(label, onClickHandle);
};

export default getAddButton;
