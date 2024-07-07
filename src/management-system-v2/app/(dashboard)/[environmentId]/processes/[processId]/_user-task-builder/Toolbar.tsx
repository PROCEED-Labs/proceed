import React from 'react';

import { Row, Button, Divider, Flex, Col } from 'antd';

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
  const { query, actions, canUndo, canRedo, selected, deleteId } = useEditor((state, query) => {
    const currentColumn = Array.from(state.events.selected)
      .map((id) => state.nodes[id])
      .find((node) => node && node.data.name === 'Column');

    let selected;
    let deleteId;

    if (currentColumn) {
      const parentRow = currentColumn.data.parent && state.nodes[currentColumn.data.parent];
      if (parentRow && parentRow.data.nodes.length === 1) {
        deleteId = parentRow.id;
      } else {
        deleteId = currentColumn.id;
      }

      const childNodeId = currentColumn.data.nodes[0];
      const childNode = state.nodes[childNodeId];

      selected = {
        id: childNodeId,
        name: childNode.data.name,
        settings: childNode.related && childNode.related.settings,
        onDelete: childNode.data.custom.onDelete as undefined | ((node: Node) => void),
        node: childNode,
      };
    }

    return {
      selected,
      deleteId,
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

  return (
    <Row className={styles.EditorHeader}>
      <Col span={4}></Col>
      <Col span={20}>
        <Flex justify="center" align="center" style={{ width: '100%' }}>
          <Flex align="center">
            <Button
              type="text"
              icon={<UndoOutlined style={{ color: canUndo ? 'blue' : undefined }} />}
              disabled={iframeMaxWidth < 601}
              onClick={() => actions.history.undo()}
            />
            <Button
              type="text"
              icon={<RedoOutlined style={{ color: canRedo ? 'blue' : undefined }} />}
              onClick={() => actions.history.redo()}
            />
          </Flex>
          <Divider type="vertical" />
          <Flex align="center">
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
          </Flex>

          {selected && (
            <>
              <Divider type="vertical" />

              {selected.settings ? React.createElement(selected.settings) : 'No settings available'}
            </>
          )}
          {deleteId && (
            <>
              <Divider type="vertical" />
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={async () => {
                  if (selected?.onDelete) {
                    await selected.onDelete(selected.node);
                  }
                  actions.delete(deleteId);
                }}
              />
            </>
          )}
        </Flex>
      </Col>
    </Row>
  );
};
