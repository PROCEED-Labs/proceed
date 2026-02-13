import React, { useState } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusSquareOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { Parameter, VirtualParameter } from '@/lib/data/machine-config-schema';

interface ActionDropdownProps {
  record: Parameter | VirtualParameter;
  isFirst: boolean;
  isLast: boolean;
  isOpen: boolean;
  isChangeable?: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onAddNested: () => void;
  onDelete: () => void;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  record,
  isFirst,
  isLast,
  isOpen,
  isChangeable,
  onOpenChange,
  onMoveUp,
  onMoveDown,
  onEdit,
  onAddNested,
  onDelete,
}) => {
  const [localOpen, setLocalOpen] = useState(false);
  const handleActionAndClose = (actionFn: () => void) => {
    actionFn();
    setLocalOpen(false);
    onOpenChange(false);
  };

  return (
    <div
      className="custom-dropdown-action-container"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Dropdown
        open={localOpen}
        onOpenChange={(open) => {
          setLocalOpen(open);
          onOpenChange(open);
        }}
        trigger={['hover']}
        placement="bottom"
        mouseEnterDelay={0.1}
        mouseLeaveDelay={0.2}
        classNames={{ root: 'custom-dropdown-overlay' }}
        menu={{
          items: [
            {
              key: 'edit',
              icon: (
                <Tooltip title="Edit" placement="top">
                  <EditOutlined />
                </Tooltip>
              ),
              label: 'Edit',
              disabled: !isChangeable,
              onClick: (e) => {
                e.domEvent.stopPropagation();
                handleActionAndClose(onEdit);
              },
              className: 'custom-menu-item custom-menu-item--edit',
            },
            {
              type: 'divider',
            },
            {
              key: 'add',
              icon: (
                <Tooltip title="Add nested metadata/parameter" placement="top">
                  <PlusSquareOutlined />
                </Tooltip>
              ),
              label: 'Add nested metadata/parameter',
              disabled: !isChangeable,
              onClick: (e) => {
                e.domEvent.stopPropagation();
                handleActionAndClose(onAddNested);
              },
              className: 'custom-menu-item custom-menu-item--add',
            },
            {
              type: 'divider',
            },
            {
              key: 'delete',
              icon: (
                <Tooltip title="Delete" placement="top">
                  <DeleteOutlined />
                </Tooltip>
              ),
              label: 'Delete',
              disabled: !isChangeable,
              danger: true,
              onClick: (e) => {
                e.domEvent.stopPropagation();
                if (record.id) {
                  handleActionAndClose(onDelete);
                }
              },
              className: 'custom-menu-item custom-menu-item--delete',
            },
          ],
        }}
      >
        <div
          className="custom-dropdown-trigger"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="custom-dropdown-dot" />
          <div className="custom-dropdown-dot" />
          <div className="custom-dropdown-dot" />
        </div>
      </Dropdown>
    </div>
  );
};

export default ActionDropdown;
