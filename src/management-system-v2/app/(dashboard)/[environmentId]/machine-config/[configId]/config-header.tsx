'use client';

import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Space, Tooltip, Flex, Dropdown } from 'antd';

import Text from 'antd/es/typography/Text';
import getAddButton from './add-button';

const getTooltips = (editable: boolean) => {
  return (
    <>
      <Tooltip title="Copy">
        <Button icon={<CopyOutlined />} type="text" style={{ margin: '0 10px' }} />
      </Tooltip>
      <Tooltip title="Edit">
        <Button icon={<EditOutlined />} type="text" style={{ margin: '0 10px' }} />
      </Tooltip>
      <Tooltip title="Delete">
        <Button
          disabled={!editable}
          icon={<DeleteOutlined />}
          type="text"
          style={{ margin: '0 10px' }}
        />
      </Tooltip>
    </>
  );
};

const getConfigHeader = (
  title: string,
  items: {
    key: string;
    label: string;
  }[],
  editable: boolean,
  tooltips: boolean = true,
) => {
  return (
    <>
      <Space.Compact block size="small">
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
          <Space align="center">
            <Text style={{ margin: '0 10px' }}>{title}</Text>
            {editable && getAddButton('Add', items)}
          </Space>
          <Space align="center">{tooltips && getTooltips(editable)}</Space>
        </Flex>
      </Space.Compact>
    </>
  );
};

export default getConfigHeader;
