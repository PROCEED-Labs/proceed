import { Button, Dropdown, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

/* type DropdownInput = {
  label: string;
  items: {
    key: string;
    label: string;
  }[];
}; */

export default function AddFieldDropdownButton(
  label: string,
  items: {
    key: string;
    label: string;
  }[],
) {
  return (
    <Dropdown menu={{ items }}>
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
    </Dropdown>
  );
}
