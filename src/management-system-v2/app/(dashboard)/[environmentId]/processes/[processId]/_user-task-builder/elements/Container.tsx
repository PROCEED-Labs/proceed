import React from 'react';

import { InputNumber, ColorPicker, Empty } from 'antd';

import { UserComponent, useEditor, useNode } from '@craftjs/core';

import { useDroppable } from '@dnd-kit/core';

import { ContextMenu, Setting } from './utils';

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
    nodeChildren,
  } = useNode((node) => {
    return { nodeId: node.id, nodeChildren: node.data.nodes };
  });

  const { setNodeRef } = useDroppable({ id: nodeId });

  return (
    <div
      id={nodeId}
      ref={(r) => {
        r && connect(r);
        setNodeRef(r);
      }}
      className="user-task-form-container"
      style={{ padding, background, border: `${borderThickness}px solid ${borderColor}` }}
    >
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
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  return (
    <>
      <Setting
        label="Padding"
        control={
          <InputNumber
            min={0}
            addonAfter="px"
            value={padding}
            disabled={!editingEnabled}
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
            disabled={!editingEnabled}
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
            disabled={!editingEnabled}
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
            disabled={!editingEnabled}
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
