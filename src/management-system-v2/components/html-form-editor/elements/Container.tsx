import React, { useContext } from 'react';

import { InputNumber, ColorPicker, Empty, Space } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';

import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import useEditorStateStore from '../use-editor-state-store';
import { ContextMenu, Setting } from './utils';
import { DragPreviewContext } from './Column';
import { useDeleteControl } from './utils';
import { DeleteButton } from '../DeleteButton';
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
      <DeleteButton show={!isRoot && editingEnabled && hovered} onClick={handleDelete} />
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
          <Space.Compact style={{ display: 'flex' }}>
            <InputNumber
              min={0}
              style={{ flex: 1 }}
              value={padding}
              onChange={(val) =>
                setProp((props: ContainerProps) => {
                  props.padding = val;
                })
              }
            />
            <Space.Addon>px</Space.Addon>
          </Space.Compact>
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
          <Space.Compact style={{ display: 'flex' }}>
            <InputNumber
              min={0}
              style={{ flex: 1 }}
              value={borderThickness}
              onChange={(val) =>
                setProp((props: ContainerProps) => {
                  props.borderThickness = val;
                })
              }
            />
            <Space.Addon>px</Space.Addon>
          </Space.Compact>
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
