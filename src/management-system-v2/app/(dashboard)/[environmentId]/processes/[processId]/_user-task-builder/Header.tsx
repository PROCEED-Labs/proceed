import React from 'react';
import { Typography, Select, Space } from 'antd';

import { EditableText } from './utils';

import { UserComponent, useNode } from '@craftjs/core';
import { ComponentSettings } from './utils';

type HeaderProps = {
  type?: 1 | 2 | 3 | 4 | 5;
  text?: string;
};

const Header: UserComponent<HeaderProps> = ({ type = 1, text = 'Double Click Me' }) => {
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
  const {
    actions: { setProp },
    type,
  } = useNode((node) => ({
    type: node.data.props.type,
  }));

  const items = [
    {
      key: 'type',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title style={{ marginBottom: 0 }} level={5}>
            Type:
          </Typography.Title>
          <Select
            options={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' },
            ]}
            value={type}
            onChange={(val) =>
              setProp((props: HeaderProps) => {
                props.type = val;
              })
            }
          />
        </Space>
      ),
    },
  ];

  return <ComponentSettings controls={items} />;
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
