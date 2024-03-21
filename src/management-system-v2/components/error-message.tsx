'use client';

import { Typography } from 'antd';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div>
      <Typography.Text type="danger">{message}</Typography.Text>
    </div>
  );
};

export default ErrorMessage;
