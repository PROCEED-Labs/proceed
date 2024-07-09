'use client';

import { EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import { MouseEventHandler } from 'react';

const getTooltips = (
  editable: boolean,
  options: string[], // 'copy', 'edit', 'delete'
  actions?: { [key: string]: MouseEventHandler | undefined },
) => {
  return (
    <Space align="center">
      {options.includes('copy') && (
        <Tooltip title="Copy">
          <Button
            icon={<CopyOutlined />}
            type="text"
            onClick={actions?.copy}
            style={{ margin: '0 0 0 10px' }}
          />
        </Tooltip>
      )}
      {options.includes('edit') && (
        <Tooltip title="Edit">
          <Button
            icon={<EditOutlined />}
            type="text"
            onClick={actions?.edit}
            style={{ margin: '0 0 0 10px' }}
          />
        </Tooltip>
      )}
      {editable && options.includes('delete') && (
        <Tooltip title="Delete">
          <Button
            /* disabled={!editable} */
            icon={<DeleteOutlined />}
            type="text"
            onClick={actions?.delete}
            style={{ margin: '0 0 0 10px' }}
          />
        </Tooltip>
      )}
    </Space>
  );
};

export default getTooltips;
