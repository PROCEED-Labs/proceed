'use client';

import { UserOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import { FC } from 'react';

const HeaderActions: FC = () => {
  return (
    <Space>
      <Button type="text">
        <u>Logout</u>
      </Button>
      <Tooltip title="Account Settings">
        <Button shape="circle" icon={<UserOutlined />} />
      </Tooltip>
    </Space>
  );
};

export default HeaderActions;
