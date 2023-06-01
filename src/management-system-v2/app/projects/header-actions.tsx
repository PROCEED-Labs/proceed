'use client';

import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { FC } from 'react';

const HeaderActions: FC = () => {
  return (
    <Space>
      <Button>
        <ImportOutlined /> Import
      </Button>
      <Button type="primary">
        <PlusOutlined /> Create
      </Button>
    </Space>
  );
};

export default HeaderActions;
