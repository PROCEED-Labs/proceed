import { useNode, UserComponent } from '@craftjs/core';

import { EditableText } from './_utils/EditableText';

type TextProps = {
  text: string;
};

const Text: UserComponent<TextProps> = ({ text }) => {
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
        tagName="div"
        style={{ margin: '14px 0' }}
        onChange={(newText) => setProp((props: TextProps) => (props.text = newText))}
      />
    </div>
  );
};

export const TextSettings = () => {
  return <div style={{ textAlign: 'center' }}>Double click the text to edit it.</div>;
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
  },
};

export default Text;
