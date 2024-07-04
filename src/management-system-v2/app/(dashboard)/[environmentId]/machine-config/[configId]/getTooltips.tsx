'use client';

import { EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';

const getTooltips = (
  editable: boolean,
  showCopy: boolean = true,
  showEdit: boolean = true,
  showDelete: boolean = true,
) => {
  return (
    <Space align="center">
      {showCopy && (
        <Tooltip title="Copy">
          <Button icon={<CopyOutlined />} type="text" style={{ margin: '0 0 0 10px' }} />
        </Tooltip>
      )}
      {showEdit && (
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} type="text" style={{ margin: '0 0 0 10px' }} />
        </Tooltip>
      )}
      {showDelete && (
        <Tooltip title="Delete">
          <Button
            disabled={!editable}
            icon={<DeleteOutlined />}
            type="text"
            style={{ margin: '0 0 0 10px' }}
          />
        </Tooltip>
      )}
    </Space>
  );
};

export default getTooltips;
