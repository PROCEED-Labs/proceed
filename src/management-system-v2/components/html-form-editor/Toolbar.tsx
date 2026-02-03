import React from 'react';

import { Row, Button, Divider, Col, Space, Modal } from 'antd';

import {
  DesktopOutlined,
  MobileOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import styles from './index.module.scss';

import useEditorControls from './use-editor-controls';
import useEditorStateStore from './use-editor-state-store';
import { useEditor } from '@craftjs/core';

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
  const { canUndo, canRedo, undo, redo, selected, deleteElement } = useEditorControls();
  
  // Check if the changes have been made to default content to enable the button
  const { query, actions, isDefault } = useEditor((state) => {
    const rootNode = state.nodes['ROOT'];
    const isDefault = rootNode?.data?.nodes?.length === 0;
    return { isDefault };
  });

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  return (
    <Row className={styles.EditorHeader}>
      <Col span={4}></Col>
      <Col span={20}>
        <Space.Compact size="large" style={{ width: '100%', justifyContent: 'center' }}>
          {editingEnabled && (
            <>
              <Button
                type="text"
                icon={<UndoOutlined style={{ color: canUndo ? 'blue' : undefined }} />}
                disabled={!canUndo}
                onClick={() => undo()}
              />
              <Button
                type="text"
                icon={<RedoOutlined style={{ color: canRedo ? 'blue' : undefined }} />}
                disabled={!canRedo}
                onClick={() => redo()}
              />
            </>
          )}
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

          {/* {editingEnabled && (
            <>
              <Divider type="vertical" />
              <Button
                danger
                disabled={!selected}
                type="text"
                icon={<DeleteOutlined />}
                onClick={async () => {
                  selected && deleteElement(selected);
                }}
              />
            </>
          )} */}
          {editingEnabled && (
            <>
              <Divider type="vertical" />
              <Button
                danger
                type="text"
                icon={<ReloadOutlined />}
                disabled={isDefault}
                onClick={() => {
                  Modal.confirm({
                    title: 'Reset Form',
                    content:
                      'Are you sure you want to reset the form to default content? This will remove all elements.',
                    okText: 'Reset',
                    okType: 'danger',
                    cancelText: 'Cancel',
                    onOk: () => {
                      // Reset to default form
                      const rootNode = query.node('ROOT').get();
                      rootNode.data.nodes.forEach((nodeId: string) => {
                        actions.delete(nodeId);
                      });
                    },
                  });
                }}
              />
            </>
          )}
        </Space.Compact>
      </Col>
    </Row>
  );
};
