'use client';

import { Result } from 'antd';
import { FC, ReactNode } from 'react';
import Content from './content';

const UnauthorizedFallback: FC<{ message?: { title?: ReactNode; subTitle?: ReactNode } }> = ({
  message,
}) => (
  <Content>
    <Result
      status="403"
      title={message?.title || 'Not allowed'}
      subTitle={message?.subTitle || "You're not allowed to view this page"}
    />
  </Content>
);

export default UnauthorizedFallback;
