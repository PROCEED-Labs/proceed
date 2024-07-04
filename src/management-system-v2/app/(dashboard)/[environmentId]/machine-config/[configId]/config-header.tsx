'use client';

import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Space, Tooltip, Flex, Dropdown } from 'antd';

import Text from 'antd/es/typography/Text';
import getTooltips from './getTooltips';
import getAddButton from './add-button';

const getConfigHeader = (
  title: string,
  items: {
    key: string;
    label: string;
  }[],
  editable: boolean,
  showCopy: boolean = true,
  showEdit: boolean = true,
  showDelete: boolean = true,
) => {
  return (
    <>
      <Space.Compact block size="small">
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
          <Space align="center">
            <Text style={{ margin: '0 10px' }}>{title}</Text>
            {/*editable && getAddButton('Add Field', items)*/}
            {/*editable && <PlusOutlined style={{ margin: '0 10px' }} />*/}
          </Space>
          {getTooltips(editable, showCopy, showEdit, showDelete)}
        </Flex>
      </Space.Compact>
    </>
  );
};

export default getConfigHeader;
