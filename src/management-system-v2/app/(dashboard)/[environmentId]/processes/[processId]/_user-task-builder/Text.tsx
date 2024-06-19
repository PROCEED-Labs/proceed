import { useNode, UserComponent } from '@craftjs/core';

import { Slider, Row, Col, InputNumber, Input } from 'antd';

const { TextArea } = Input;

import { useState } from 'react';

type TextProps = {
  text: string;
  fontSize?: string | number;
};

const Text: UserComponent<TextProps> = ({ text, fontSize }) => {
  const {
    connectors: { connect, drag },
    actions: { setProp },
  } = useNode();

  const [editable, setEditable] = useState(false);
  const [current, setCurrent] = useState(text);

  const handleDoubleClick = () => {
    setEditable(true);
  };

  const handleSave = () => {
    setProp((props: TextProps) => {
      props.text = current;
    });
    setEditable(false);
  };

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
    >
      {editable ? (
        <TextArea
          autoFocus
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={handleSave}
          onPressEnter={(e) => {
            if (!e.shiftKey) handleSave();
          }}
        />
      ) : (
        <p style={{ fontSize, whiteSpace: 'pre-line' }} onDoubleClick={handleDoubleClick}>
          {text}
        </p>
      )}
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
    <InputNumber
      value={fontSize}
      onChange={(val) => setProp((props: TextProps) => (props.fontSize = val))}
    />
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
