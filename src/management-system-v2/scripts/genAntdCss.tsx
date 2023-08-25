/**
 * Generate a static Antd CSS file.
 *
 * This script is used to generate an Antd CSS file for NextJS to use in the
 * HTML head. Otherwise, the SSR Antd components on initial load would have no
 * style, since they use css-in-js which has no effect in SSR. Other solutions
 * are possible, but this is the only one that allows the user to cache the CSS
 * file. Style injection would quickly bloat the page size and slow hydration.
 *
 * See: https://ant.design/docs/react/customize-theme#server-side-render-ssr
 */

// Note: This is based on https://github.com/ant-design/static-style-extract
// We can't use that package directly because it brings its own antd dependency
// which means the hash using the version wouldn't be the same between the app
// and the script.

import React, { ElementType } from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import Theme from '../components/theme';
// To ensure the same class name calculation, we must use the same version here
// as in the app. Therefore this package isn't listed in package.json as a
// dependency, because we want to use the same as the current antd version.
import { createCache, extractStyle as extStyle, StyleProvider } from '@ant-design/cssinjs';
import * as antd from 'antd';

// These are client-only or style-less components that don't need to be included
// in the CSS file.
const blackList = [
  'ConfigProvider',
  'Drawer',
  'Grid',
  'Modal',
  'Popconfirm',
  'Popover',
  'Tooltip',
  'Tour',
];

// A node containing all the relevant antd components.
const Components = (
  <>
    {(Object.keys(antd) as (keyof typeof antd)[])
      .filter((name) => !blackList.includes(name) && name[0] === name[0].toUpperCase())
      .map((compName) => {
        const Comp = antd[compName] as ElementType;
        if (compName === 'Dropdown') {
          return (
            <Comp key={compName} menu={{ items: [] }}>
              <div />
            </Comp>
          );
        }
        return <Comp key={compName} />;
      })}
  </>
);

export function extractThemedStyle() {
  // NOTE: If you are using multiple themes in the app, you can use them all
  // below.

  // Create a cache to store the styles of all components with the given themes.
  const cache = createCache();
  renderToString(
    <StyleProvider cache={cache}>
      <Theme>{Components}</Theme>
    </StyleProvider>,
  );

  // Grab style from cache
  const styleText = extStyle(cache, true);

  return styleText;
}

const outputPath = './public/antd.min.css';

// Extract the CSS and write it to a file.
const css = extractThemedStyle();

fs.writeFileSync(outputPath, css);

console.log(`🎉 Antd CSS generated at ${outputPath}`);
