import React from 'react';

import { useEditor } from '@craftjs/core';

import styles from './index.module.scss';

export const Settings: React.FC = () => {
  const { settings, selectedNodeId } = useEditor((state) => {
    const currentColumn = Array.from(state.events.selected)
      .map((id) => state.nodes[id])
      .find((node) => node && node.data.name === 'Column');

    let settings;
    let selectedNodeId;

    if (currentColumn) {
      const childNode = state.nodes[currentColumn.data.nodes[0]];
      settings = childNode.related && childNode.related.settings;
      selectedNodeId = childNode.id;
    }

    return {
      settings,
      selectedNodeId,
    };
  });

  let settingsElement = <div style={{ textAlign: 'center' }}>No settings available.</div>;

  if (!selectedNodeId) {
    settingsElement = <div style={{ textAlign: 'center' }}>No element selected.</div>;
  } else if (settings) {
    settingsElement = React.createElement(settings);
  }

  return (
    <div className={styles.Settings}>
      {settingsElement}
      {/* this id is targeted by react portals that can be used in elements to edit specific sections of the element*/}
      <div id="sub-element-settings-toolbar"></div>
    </div>
  );
};

export default Settings;
