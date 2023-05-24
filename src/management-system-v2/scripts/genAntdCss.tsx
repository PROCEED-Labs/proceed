/**
 * Generate a static Antd CSS file.
 *
 * This script is used to generate an Antd CSS file for NextJS to use in the
 * head. Otherwise, the SSR Antd components would have no style, since they use
 * css-in-js. Other solutions are possible, but this is the only one that allows
 * the user to cache the CSS file. Style injection would quickly bloat the page
 * size and slow hydration.
 *
 * See: https://ant.design/docs/react/customize-theme#server-side-render-ssr
 */

import fs from 'fs';
import { extractStyle } from '@ant-design/static-style-extract';
import Theme from '../components/theme';

const outputPath = './public/antd.min.css';

// With custom theme
const css = extractStyle((node) => Theme({ children: node })!);

fs.writeFileSync(outputPath, css);

console.log(`🎉 Antd CSS generated at ${outputPath}`);
