'use client';

import React, { ComponentType, FC, useEffect, useState } from 'react';
import {
  ExtensionPoint,
  PluginManifest,
  getPluginsForExtensionPoint,
} from 'proceed-frontend-plugin-system';
import { Card } from 'antd';

const Plugins: FC = () => {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);

  useEffect(() => {
    getPluginsForExtensionPoint('plugins-page').then(setPlugins);
  }, []);

  return (
    <div>
      <p>In total there are {plugins.length} installed plugins.</p>
      <ul>
        {plugins.map((plugin) => (
          <li key={plugin.name}>
            {plugin.name} - {plugin.bundle}
          </li>
        ))}
      </ul>

      <Card>
        <ul>
          <ExtensionPoint extensionPoint="plugins-page" data={null}>
            <li>
              <ExtensionPoint.Content />
            </li>
          </ExtensionPoint>
        </ul>
      </Card>
    </div>
  );
};

export default Plugins;
