import React, { ReactNode } from 'react';

import { Button as AntButton, Row } from 'antd';

import { LuFormInput, LuImage, LuTable, LuText } from 'react-icons/lu';
import { MdCheckBox, MdRadioButtonChecked, MdTitle } from 'react-icons/md';
import { RxGroup } from 'react-icons/rx';

import { Element, useEditor, NodeTree, WithoutPrivateActions } from '@craftjs/core';

import styles from './Sidebar.module.scss';

import Text from './Text';
import Container from './Container';
import Input from './Input';
import CheckboxOrRadio from './CheckboxOrRadio';
import Header from './Header';
import Column from './Column';
import Table from './Table';
import Image from './Image';

function selectOnCreation(nodeTree: NodeTree, actions: WithoutPrivateActions<null>) {
  const newNode = Object.values(nodeTree.nodes || {}).find((el) => el.data.name !== 'Row');

  if (newNode) {
    actions.selectNode(newNode.id);
  }
}

type CreationButtonProps = React.PropsWithChildren<{
  title: string;
  icon: ReactNode;
}>;

const CreationButton: React.FC<CreationButtonProps> = ({ children, title, icon }) => {
  const { connectors, actions } = useEditor();

  return (
    <AntButton
      className={styles.CreationButton}
      ref={(r) => {
        r &&
          connectors.create(r, <Column>{children}</Column>, {
            onCreate: (nodeTree) => {
              selectOnCreation(nodeTree, actions);
            },
          });
      }}
      icon={icon}
    >
      {title}
    </AntButton>
  );
};

export const Toolbox = () => {
  return (
    <Row className={styles.Sidebar}>
      <CreationButton title="Header" icon={<MdTitle />}>
        <Header text="Double Click Me" />
      </CreationButton>
      <CreationButton title="Text" icon={<LuText />}>
        <Text text="Double Click Me" />
      </CreationButton>
      <CreationButton title="Input" icon={<LuFormInput />}>
        <Input type="text" label="Double Click Me" />
      </CreationButton>
      <CreationButton title="Radio" icon={<MdRadioButtonChecked />}>
        <CheckboxOrRadio type="radio" />
      </CreationButton>
      <CreationButton title="Checkbox" icon={<MdCheckBox />}>
        <CheckboxOrRadio type="checkbox" />
      </CreationButton>
      <CreationButton title="Table" icon={<LuTable />}>
        <Table />
      </CreationButton>
      <CreationButton title="Container" icon={<RxGroup />}>
        <Element is={Container} padding={20} canvas />
      </CreationButton>
      <CreationButton title="Image" icon={<LuImage />}>
        <Image />
      </CreationButton>
    </Row>
  );
};
