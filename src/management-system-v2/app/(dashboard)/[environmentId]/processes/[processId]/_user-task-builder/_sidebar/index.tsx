import React from 'react';

import { Divider, Row } from 'antd';

import styles from './index.module.scss';

import Toolbox from './Toolbox';
import Settings from './Settings';

const Sidebar: React.FC<{ businessObjectId: string }> = ({ businessObjectId }) => {
  return (
    <Row className={styles.Sidebar}>
      <Divider>Elements</Divider>
      <Toolbox businessObjectId={businessObjectId} />
      <Divider>Settings</Divider>
      <Settings />
    </Row>
  );
};

export default Sidebar;
