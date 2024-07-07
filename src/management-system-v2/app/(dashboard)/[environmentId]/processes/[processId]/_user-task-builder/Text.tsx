import { useNode, UserComponent } from '@craftjs/core';

import { InputNumber, Space } from 'antd';

import { ComponentSettings, EditableText } from './utils';

type TextProps = {
  text: string;
  fontSize?: string | number;
};

const Text: UserComponent<TextProps> = ({ text, fontSize }) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
    >
      <EditableText
        value={text}
        tagName="p"
        style={{ fontSize, whiteSpace: 'pre-line' }}
        onChange={(newText) => setProp((props: TextProps) => (props.text = newText))}
      />
    </div>
  );
};

export const TextSettings = () => {
  const {
    actions: { setProp },
    fontSize,
  } = useNode((node) => ({
    fontSize: node.data.props.fontSize,
  }));

  const items = [
    {
      key: 'type',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <InputNumber
            value={fontSize}
            addonAfter="pt"
            onChange={(val) => setProp((props: TextProps) => (props.fontSize = val))}
          />
        </Space>
      ),
    },
  ];

  return <ComponentSettings controls={items} />;
};

Text.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: TextSettings,
  },
  props: {
    text: 'Hi',
    fontSize: 14,
  },
};

export default Text;
