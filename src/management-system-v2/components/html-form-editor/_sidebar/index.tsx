import React from 'react';

import { Divider, Row } from 'antd';

import styles from './index.module.scss';

import Settings from './Settings';
import Toolbox, { ToolboxEntries } from './Toolbox';
import useEditorStateStore from '../use-editor-state-store';

type SidebarProps = {
  toolbox: ToolboxEntries;
};

const Sidebar: React.FC<SidebarProps> = ({ toolbox }) => {
  const isTextEditing = useEditorStateStore((state) => state.isTextEditing);

  return (
    <Row className={styles.Sidebar}>
      <Divider>Elements</Divider>
      <Toolbox entries={toolbox} />
      {isTextEditing && <Divider>Text Editor</Divider>}
      {/* this id is targeted by a react portal to render the text editor interface when a user starts text editing */}
      <div style={{ margin: 'auto' }} id="text-editable-toolbar"></div>
      <Divider>Settings</Divider>
      <Settings />
    </Row>
  );
};

export default Sidebar;
