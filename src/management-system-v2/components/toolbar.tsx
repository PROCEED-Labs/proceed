'use client';

import React, { PropsWithChildren } from 'react';

import { Space, theme } from 'antd';

type ToolbarProps = {
  className?: string;
};

export const Toolbar: React.FC<PropsWithChildren<ToolbarProps>> = ({ children, className }) => {
  return (
    <div
      role="toolbar"
      className={className}
      style={{
        position: 'absolute',
        zIndex: 10,
        padding: '12px',
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};

export const ToolbarGroup: React.FC<PropsWithChildren> = ({ children }) => {
  const { token } = theme.useToken();
  return (
    <Space.Compact
      size="large"
      style={{
        backgroundColor: token.colorBgContainer,
      }}
    >
      {children}
    </Space.Compact>
  );
};
