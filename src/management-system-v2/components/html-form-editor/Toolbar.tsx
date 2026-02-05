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
import { addDefaultElements } from '.';

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

    // Check if current state matches exactly the default state
    const hasDefaultStructure = rootNode?.data?.nodes?.length === 4;

    if (!hasDefaultStructure) {
      return { isDefault: false };
    }

    // Define expected default element types and props
    const expectedElements = [
      {
        elementType: 'Text',
        text: '<h1 class="text-style-heading" dir="ltr"><b><strong class="text-style-bold" style="white-space: pre-wrap;">New Title Element</strong></b></h1>',
      },
      {
        elementType: 'Text',
        text: 'New Text Element',
      },
      {
        elementType: 'Input',
        label: 'New Input',
        inputType: 'text',
        labelPosition: 'top',
        defaultValue: '',
      },
      {
        elementType: 'SubmitButton',
        title: 'Submit',
        buttonType: 'primary',
        block: false,
      },
    ];

    // Check each row matches expected default
    const isDefault = rootNode.data.nodes.every((rowId: string, index: number) => {
      const row = state.nodes[rowId];
      if (!row || row.data.nodes.length !== 1) return false;

      const columnId = row.data.nodes[0];
      const column = state.nodes[columnId];
      if (!column || column.data.nodes.length !== 1) return false;

      const elementId = column.data.nodes[0];
      const element = state.nodes[elementId];
      if (!element) return false;

      const expected = expectedElements[index];
      const actualElementType = element.data.displayName || element.data.name;

      // Check if type matches
      if (actualElementType !== expected.elementType) return false;

      // Check props
      if (expected.elementType === 'Text') {
        return element.data.props.text === expected.text;
      } else if (expected.elementType === 'Input') {
        return (
          element.data.props.label === expected.label &&
          element.data.props.type === expected.inputType &&
          element.data.props.labelPosition === expected.labelPosition &&
          (element.data.props.defaultValue || '') === expected.defaultValue
        );
      } else if (expected.elementType === 'SubmitButton') {
        return (
          element.data.props.title === expected.title &&
          element.data.props.type === expected.buttonType &&
          (element.data.props.block || false) === expected.block
        );
      }

      return true;
    });

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
                      'Are you sure you want to reset the form to the default template? This will replace all current elements.',
                    okText: 'Reset',
                    okType: 'danger',
                    cancelText: 'Cancel',
                    onOk: () => {
                      // Reset to default form
                      const rootNode = query.node('ROOT').get();
                      rootNode.data.nodes.forEach((nodeId: string) => {
                        actions.delete(nodeId);
                      });
                      // Add default elements back
                      addDefaultElements(actions, query);
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
