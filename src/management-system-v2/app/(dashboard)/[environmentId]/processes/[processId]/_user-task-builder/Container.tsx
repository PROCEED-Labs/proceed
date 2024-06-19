import { Row, Typography, InputNumber, ColorPicker, Empty } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';

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

  return (
    <>
      <Row>
        <Typography.Title style={{ marginRight: 10 }} level={5}>
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
      </Row>
      <Row>
        <Typography.Title style={{ marginRight: 10 }} level={5}>
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
      </Row>
      <Row>
        <Typography.Title style={{ marginRight: 10 }} level={5}>
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
      </Row>
      <Row>
        <Typography.Title style={{ marginRight: 10 }} level={5}>
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
      </Row>
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
    borderThickness: 2,
    borderColor: '#d3d3d3',
  },
};

export default Container;
