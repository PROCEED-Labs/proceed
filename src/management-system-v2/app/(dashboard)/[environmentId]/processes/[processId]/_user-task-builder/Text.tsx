import { useNode, UserComponent } from '@craftjs/core';

import { InputNumber } from 'antd';

import { EditableText, Setting } from './utils';

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

  return (
    <>
      <Setting
        label="Font Size"
        control={
          <InputNumber
            value={fontSize}
            addonAfter="pt"
            onChange={(val) => setProp((props: TextProps) => (props.fontSize = val))}
          />
        }
      />
    </>
  );
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
