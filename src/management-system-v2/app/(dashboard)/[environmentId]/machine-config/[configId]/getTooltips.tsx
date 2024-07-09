'use client';

import { EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';

const getTooltips = (
  editable: boolean,
  options: string[], // 'copy', 'edit', 'delete'
) => {
  return (
    <Space align="center">
      {options.includes('copy') && (
        <Tooltip title="Copy">
          <Button icon={<CopyOutlined />} type="text" style={{ margin: '0 0 0 10px' }} />
        </Tooltip>
      )}
      {options.includes('edit') && (
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} type="text" style={{ margin: '0 0 0 10px' }} />
        </Tooltip>
      )}
      {editable && options.includes('delete') && (
        <Tooltip title="Delete">
          <Button
            /* disabled={!editable} */
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
