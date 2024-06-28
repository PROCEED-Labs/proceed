import React from 'react';

import { Typography, InputNumber, ColorPicker, Empty, Space } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';
import { ComponentSettings } from './utils';

export type ContainerProps = React.PropsWithChildren & {
  padding?: string | number;
  background?: string;
  borderThickness?: number;
  borderColor?: string;
};

const Container: UserComponent<ContainerProps> = ({
  children,
  padding = 0,
  background,
  borderThickness,
  borderColor,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
      className="user-task-form-container"
      style={{ padding, background, border: `${borderThickness}px solid ${borderColor}` }}
    >
      {children || (
        <Empty style={{ textAlign: 'center', height: '100%' }} description="Drop elements here" />
      )}
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

  const items = [
    {
      key: 'padding',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Padding:
          </Typography.Title>
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
        </Space>
      ),
    },
    {
      key: 'bg-color',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Background Color:
          </Typography.Title>
          <ColorPicker
            value={background}
            onChange={(_, val) =>
              setProp((props: ContainerProps) => {
                props.background = val;
              })
            }
          />
        </Space>
      ),
    },
    {
      key: 'border-thickness',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Border Thickness:
          </Typography.Title>
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
        </Space>
      ),
    },
    {
      key: 'border-color',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Border Color:
          </Typography.Title>
          <ColorPicker
            value={borderColor}
            onChange={(_, val) =>
              setProp((props: ContainerProps) => {
                props.borderColor = val;
              })
            }
          />
        </Space>
      ),
    },
  ];

  return <ComponentSettings controls={items} />;
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
    borderThickness: 2,
    borderColor: '#d3d3d3',
  },
};

export default Container;
