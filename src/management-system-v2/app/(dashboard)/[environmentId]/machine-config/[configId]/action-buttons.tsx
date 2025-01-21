'use client';

import { EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import { MouseEventHandler } from 'react';

import styles from './page.module.scss';

type ActionButtonsProps = {
  editable: boolean;
  options: string[];
  actions?: { [key: string]: MouseEventHandler | undefined };
};

const ActionButtons: React.FC<ActionButtonsProps> = ({ editable, options, actions }) => {
  return (
    <Space.Compact className={styles.ActionButtons} size="small">
      {editable && options.includes('copy') && (
        <Tooltip title="Copy">
          <Button icon={<CopyOutlined />} type="text" onClick={actions?.copy} />
        </Tooltip>
      )}
      {editable && options.includes('edit') && (
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} type="text" onClick={actions?.edit} />
        </Tooltip>
      )}
      {editable && options.includes('delete') && (
        <Tooltip title="Delete">
          <Button
            /* disabled={!editable} */
            icon={<DeleteOutlined />}
            type="text"
            onClick={actions?.delete}
          />
        </Tooltip>
      )}
    </Space.Compact>
  );
};

export default ActionButtons;
