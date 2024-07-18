import React from 'react';

import { Row, Button, Divider, Col, Space } from 'antd';

import {
  DesktopOutlined,
  MobileOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import styles from './index.module.scss';

import { useEditor, Node } from '@craftjs/core';
import { useAddControlCallback } from '@/lib/controls-store';

export type EditorLayout = 'computer' | 'mobile';

type ToolbarProps = {
  iframeMaxWidth: number;
  iframeLayout: EditorLayout;
  onLayoutChange: (newLayout: EditorLayout) => void;
};

export const Toolbar: React.FC<ToolbarProps> = ({
  iframeMaxWidth,
  iframeLayout,
  onLayoutChange,
}) => {
  const { query, actions, canUndo, canRedo, onDelete } = useEditor((state, query) => {
    const currentColumn = Array.from(state.events.selected)
      .map((id) => state.nodes[id])
      .find((node) => node && node.data.name === 'Column');

    let onDelete;

    if (currentColumn) {
      const parentRow = currentColumn.data.parent && state.nodes[currentColumn.data.parent];
      let deleteId = currentColumn.id;

      if (parentRow && parentRow.data.nodes.length === 1) {
        deleteId = parentRow.id;
      }

      const childNodeId = currentColumn.data.nodes[0];
      const childNode = state.nodes[childNodeId];

      onDelete = async () => {
        if (childNode.data.custom.onDelete) {
          await (childNode.data.custom.onDelete as (node: Node) => Promise<void>)(childNode);
        }
        actions.delete(deleteId!);
      };
    }

    return {
      onDelete,
      canUndo: query.history.canUndo(),
      canRedo: query.history.canRedo(),
    };
  });

  useAddControlCallback('user-task-editor', 'undo', () => {
    if (query.history.canUndo()) actions.history.undo();
  });
  useAddControlCallback('user-task-editor', 'redo', () => {
    if (query.history.canRedo()) actions.history.redo();
  });
  useAddControlCallback(
    'user-task-editor',
    'delete',
    () => {
      onDelete?.();
    },
    { dependencies: [onDelete] },
  );

  return (
    <Row className={styles.EditorHeader}>
      <Col span={4}></Col>
      <Col span={20}>
        <Space.Compact size="large" style={{ width: '100%', justifyContent: 'center' }}>
          <>
            <Button
              type="text"
              icon={<UndoOutlined style={{ color: canUndo ? 'blue' : undefined }} />}
              disabled={!canUndo}
              onClick={() => actions.history.undo()}
            />
            <Button
              type="text"
              icon={<RedoOutlined style={{ color: canRedo ? 'blue' : undefined }} />}
              disabled={!canRedo}
              onClick={() => actions.history.redo()}
            />
          </>
          <>
            <Divider type="vertical" />
            <Button
              type="text"
              icon={
                <DesktopOutlined
                  style={{ color: iframeLayout === 'computer' ? 'blue' : undefined }}
                />
              }
              disabled={iframeMaxWidth < 601}
              onClick={() => onLayoutChange('computer')}
            />
            <Button
              type="text"
              icon={
                <MobileOutlined style={{ color: iframeLayout === 'mobile' ? 'blue' : undefined }} />
              }
              onClick={() => onLayoutChange('mobile')}
            />
          </>

          <>
            <Divider type="vertical" />
            <Button
              danger
              disabled={!onDelete}
              type="text"
              icon={<DeleteOutlined />}
              onClick={async () => {
                await onDelete!();
              }}
            />
          </>
        </Space.Compact>
      </Col>
    </Row>
  );
};
