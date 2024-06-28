import React from 'react';

import { Button as AntButton, Row } from 'antd';

import { Element, useEditor, NodeTree, WithoutPrivateActions } from '@craftjs/core';

import Text from './Text';
import Container from './Container';
import Input from './Input';
import CheckboxOrRadio from './CheckboxOrRadio';
import Header from './Header';
import Column from './Column';
import Table from './Table';

function selectOnCreation(nodeTree: NodeTree, actions: WithoutPrivateActions<null>) {
  const newNode = Object.values(nodeTree.nodes || {}).find((el) => el.data.name !== 'Row');

  if (newNode) {
    actions.selectNode(newNode.id);
  }
}

type CreationButtonProps = React.PropsWithChildren<{
  title: string;
}>;

const CreationButton: React.FC<CreationButtonProps> = ({ children, title }) => {
  const { connectors, actions } = useEditor();

  return (
    <AntButton
      ref={(r) => {
        r &&
          connectors.create(r, <Column>{children}</Column>, {
            onCreate: (nodeTree) => {
              selectOnCreation(nodeTree, actions);
            },
          });
      }}
      style={{ width: '100%' }}
    >
      {title}
    </AntButton>
  );
};

export const Toolbox = () => {
  return (
    <Row>
      <CreationButton title="Header">
        <Header text="Double Click Me" />
      </CreationButton>
      <CreationButton title="Text">
        <Text text="Double Click Me" />
      </CreationButton>
      <CreationButton title="Input">
        <Input type="text" label="Double Click Me" />
      </CreationButton>
      <CreationButton title="Radio">
        <CheckboxOrRadio type="radio" />
      </CreationButton>
      <CreationButton title="Checkbox">
        <CheckboxOrRadio type="checkbox" />
      </CreationButton>
      <CreationButton title="Table">
        <Table />
      </CreationButton>
      <CreationButton title="Container">
        <Element is={Container} padding={20} canvas />
      </CreationButton>
    </Row>
  );
};
