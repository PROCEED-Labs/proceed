'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Space, Dropdown } from 'antd';

const getAddChildDropdown = () => {
  const items = [
    {
      key: '1',
      label: 'Target Configuration',
    },
    {
      key: '2',
      label: 'Machine Configuration',
    },
  ];
  return (
    <Dropdown menu={{ items }}>
      <Button>
        <Space>
          Add Child Configuration{' '}
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

export default getAddChildDropdown;
