import React from 'react';

import { useEditor } from '@craftjs/core';

import styles from './index.module.scss';
import useBuilderStateStore from '../use-builder-state-store';

export const Settings: React.FC = () => {
  const { settings, selectedNodeId, query } = useEditor((state) => {
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

  const isTextEditing = useBuilderStateStore((state) => state.isTextEditing);

  return (
    <div className={styles.Settings}>
      {/* this id is targeted by a react portal to render the text editor interface when a user starts text editing */}
      <div id="text-editable-toolbar"></div>
      {!isTextEditing &&
        (selectedNodeId ? (
          settings ? (
            <>{React.createElement(settings)}</>
          ) : (
            <div style={{ textAlign: 'center' }}>No settings available.</div>
          )
        ) : (
          <div style={{ textAlign: 'center' }}>No element selected.</div>
        ))}
      {/* this id is targeted by react portals that can be used in elements to edit specific sections of the element*/}
      <div id="sub-element-settings-toolbar"></div>
    </div>
  );
};

export default Settings;
