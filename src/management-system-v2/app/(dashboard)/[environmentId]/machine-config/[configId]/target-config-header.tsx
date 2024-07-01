'use client';

import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Space, Tooltip, Flex, Dropdown } from 'antd';

import Text from 'antd/es/typography/Text';

const getTargetConfigHeader = (name: string) => {
  const items = [
    {
      key: '1',
      label: 'Custom Field',
    },
    {
      key: '2',
      label: 'Attachment',
    },
    {
      key: '3',
      label: 'Picture',
    },
    {
      key: '4',
      label: 'ID',
    },
    {
      key: '5',
      label: 'Owner',
    },
    {
      key: '6',
      label: 'Description',
    },
  ];
  return (
    <>
      <Space.Compact block size="small">
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
          <Text>Target Configuration: {name}</Text>
          <Dropdown menu={{ items }}>
            <Button>
              <Space>
                Add Field
                <PlusOutlined
                  style={{
                    margin: '0 0 0 6px',
                  }}
                />
              </Space>
            </Button>
          </Dropdown>
          <Space align="center">
            <Tooltip title="Copy">
              <Button icon={<CopyOutlined />} type="text" style={{ margin: '0 10px' }} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button icon={<EditOutlined />} type="text" style={{ margin: '0 10px' }} />
            </Tooltip>
            <Tooltip title="Delete">
              <Button icon={<DeleteOutlined />} type="text" style={{ margin: '0 10px' }} />
            </Tooltip>
          </Space>
        </Flex>
      </Space.Compact>
    </>
  );
};

export default getTargetConfigHeader;
