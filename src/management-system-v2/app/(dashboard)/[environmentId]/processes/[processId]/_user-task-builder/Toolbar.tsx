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
import { useCanEdit } from '../modeler';
import useEditorControls from './use-editor-controls';

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

  const editingEnabled = useCanEdit();

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

          {editingEnabled && (
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
          )}
        </Space.Compact>
      </Col>
    </Row>
  );
};
