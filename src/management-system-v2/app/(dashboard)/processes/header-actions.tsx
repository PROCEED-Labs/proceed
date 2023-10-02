'use client';

import { AuthCan } from '@/lib/iamComponents';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { FC } from 'react';

const HeaderActions: FC = () => {
  return (
    <Space>
      <Button>
        <ImportOutlined /> Import
      </Button>

      <AuthCan action="create" resource="Process">
        <Button type="primary">
          <PlusOutlined /> Create
        </Button>
      </AuthCan>
    </Space>
  );
};

export default HeaderActions;
