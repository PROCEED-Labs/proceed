import React from 'react';

import { Divider, Row } from 'antd';

import styles from './index.module.scss';

import Toolbox from './Toolbox';
import Settings from './Settings';
import useBuilderStateStore from '../use-builder-state-store';

const Sidebar = () => {
  const isTextEditing = useBuilderStateStore((state) => state.isTextEditing);

  return (
    <Row className={styles.Sidebar}>
      <Divider>Elements</Divider>
      <Toolbox />
      {isTextEditing && <Divider>Text Editor</Divider>}
      {/* this id is targeted by a react portal to render the text editor interface when a user starts text editing */}
      <div style={{ margin: 'auto' }} id="text-editable-toolbar"></div>
      <Divider>Settings</Divider>
      <Settings />
    </Row>
  );
};

export default Sidebar;
