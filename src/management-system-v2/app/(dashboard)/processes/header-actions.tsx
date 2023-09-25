'use client';

import Modal from '@/components/async-modal';
import { AuthCan } from '@/lib/iamComponents';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space } from 'antd';
import { FC, useState } from 'react';

type FieldType = {
  processname?: string;
  processdescription?: string;
};

const HeaderActions: FC = () => {
  const [open, setOpen] = useState(false);
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
