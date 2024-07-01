import { Button, Dropdown, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const getAddFieldDropdown = (
  label: string,
  items: {
    key: string;
    label: string;
  }[],
) => {
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
};

export default getAddFieldDropdown;
