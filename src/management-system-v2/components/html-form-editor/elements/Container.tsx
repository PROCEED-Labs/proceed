import React, { useContext } from 'react';

import { InputNumber, ColorPicker, Empty } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';

import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import useEditorStateStore from '../use-editor-state-store';
import { ContextMenu, Setting } from './utils';
import { DragPreviewContext } from './Column';
import { DeleteOutlined } from '@ant-design/icons';
import { useDeleteControl } from './utils';
export type ContainerProps = React.PropsWithChildren & {
  padding?: string | number;
  background?: string;
  borderThickness?: number;
  borderColor?: string;
};

/**
 * This component can be used to group multiple rows of elements (used as the editors root element)
 */
const Container: UserComponent<ContainerProps> = ({
  children,
  padding = 0,
  background,
  borderThickness,
  borderColor,
}) => {
  const {
    connectors: { connect },
    nodeId,
  } = useNode((node) => {
    return { nodeId: node.id, nodeChildren: node.data.nodes };
  });

  const [hovered, setHovered] = useState(false);
  const { handleDelete } = useDeleteControl();
  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  const isDragPreview = useContext(DragPreviewContext);
  const droppableId = isDragPreview ? '' : nodeId;
  const { setNodeRef } = useDroppable({ id: droppableId });

  // Do not show overlay for root container
  const isRoot = nodeId === 'ROOT';

  return (
    <div
      id={droppableId}
      ref={(r) => {
        !isDragPreview && r && connect(r);
        setNodeRef(r);
      }}
      className="user-task-form-container"
      style={{
        padding,
        background,
        border: `${borderThickness}px solid ${borderColor}`,
        position: isRoot ? 'static' : 'relative',
      }}
      onMouseEnter={() => !isRoot && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isRoot && editingEnabled && hovered && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '8px',
            zIndex: 999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '4px',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseMove={(e) => e.stopPropagation()}
        >
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '14px',
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '3px',
              transition: 'background-color 0.15s ease',
              backgroundColor: 'transparent',
              padding: '0',
            }}
            onClick={handleDelete}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <DeleteOutlined />
          </button>
        </div>
      )}
      <ContextMenu menu={[]}>
        {children ? (
          <>{children}</>
        ) : (
          <Empty style={{ textAlign: 'center', height: '100%' }} description="Drop elements here" />
        )}
      </ContextMenu>
    </div>
  );
};

export const ContainerSettings = () => {
  const {
    actions: { setProp },
    padding,
    background,
    borderThickness,
    borderColor,
  } = useNode((node) => ({
    padding: node.data.props.padding,
    background: node.data.props.background,
    borderThickness: node.data.props.borderThickness,
    borderColor: node.data.props.borderColor,
  }));

  return (
    <>
      <Setting
        label="Padding"
        control={
          <InputNumber
            min={0}
            addonAfter="px"
            value={padding}
            onChange={(val) =>
              setProp((props: ContainerProps) => {
                props.padding = val;
              })
            }
          />
        }
      />
      <Setting
        label="Background Color"
        style={{ display: 'flex', alignItems: 'center' }}
        control={
          <ColorPicker
            value={background}
            onChange={(_, val) =>
              setProp((props: ContainerProps) => {
                props.background = val;
              })
            }
          />
        }
      />
      <Setting
        label="Border Thickness"
        control={
          <InputNumber
            min={0}
            addonAfter="px"
            value={borderThickness}
            onChange={(val) =>
              setProp((props: ContainerProps) => {
                props.borderThickness = val;
              })
            }
          />
        }
      />
      <Setting
        label="Border Color"
        style={{ display: 'flex', alignItems: 'center' }}
        control={
          <ColorPicker
            value={borderColor}
            onChange={(_, val) =>
              setProp((props: ContainerProps) => {
                props.borderColor = val;
              })
            }
          />
        }
      />
    </>
  );
};

Container.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: ContainerSettings,
  },
  props: {
    padding: 0,
    background: '#fff',
    borderThickness: 1,
    borderColor: '#d3d3d3',
  },
};

export default Container;
