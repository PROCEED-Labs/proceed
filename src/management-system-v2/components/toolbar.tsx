'use client';

import React, { PropsWithChildren } from 'react';

import { Space } from 'antd';

export const Toolbar: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div style={{ position: 'absolute', zIndex: 10, padding: '12px', width: '100%' }}>
      {children}
    </div>
  );
};

export const ToolbarGroup: React.FC<PropsWithChildren> = ({ children }) => {
  return <Space.Compact size="large">{children}</Space.Compact>;
};
