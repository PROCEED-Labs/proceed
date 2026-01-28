'use client';

import { Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';

interface ErrorMessageProps {
  message: ReactNode;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}
    >
      <Typography.Title type="danger">
        <ExclamationCircleOutlined style={{ fontSize: '24px', marginRight: '10px' }} />
        {message}
      </Typography.Title>
    </div>
  );
};

export default ErrorMessage;
