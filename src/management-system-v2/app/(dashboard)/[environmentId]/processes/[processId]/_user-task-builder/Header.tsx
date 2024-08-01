import React from 'react';

import { EditableText } from './_utils/EditableText';

import { UserComponent, useNode } from '@craftjs/core';

type HeaderProps = {
  type?: 1 | 2 | 3 | 4 | 5;
  text?: string;
};

const Header: UserComponent<HeaderProps> = ({ type = 1, text = '<h1>Double Click Me</h1>' }) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();

  const headerType = ['h1', 'h2', 'h3', 'h4', 'h5'];

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
    >
      <EditableText
        value={text}
        tagName={headerType[type - 1]}
        onChange={(newText) => setProp((props: HeaderProps) => (props.text = newText))}
      />
    </div>
  );
};

export const HeaderSettings = () => {
  return <div style={{ textAlign: 'center' }}>Double click the text to edit it.</div>;
};

Header.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: HeaderSettings,
  },
  props: {
    type: 1,
    text: '',
  },
};

export default Header;
