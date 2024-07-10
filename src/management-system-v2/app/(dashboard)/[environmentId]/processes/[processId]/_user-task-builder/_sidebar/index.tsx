import React from 'react';

import { Divider, Row } from 'antd';

import styles from './index.module.scss';

import Toolbox from './Toolbox';
import Settings, { WithIframeRef } from './Settings';

const Sidebar: React.FC<WithIframeRef> = ({ iframeRef }) => {
  return (
    <Row className={styles.Sidebar}>
      <Divider>Elements</Divider>
      <Toolbox />
      <Divider>Settings</Divider>
      <Settings iframeRef={iframeRef} />
    </Row>
  );
};

export default Sidebar;
