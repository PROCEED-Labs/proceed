import { ConfigProvider } from 'antd';
// This React import is required for the JSX to work in the script file.
import React, { FC, PropsWithChildren } from 'react';

/**
 * IMPORTANT:
 *
 * This component is used to override the default theme of Ant Design. If you
 * change any of the values here, you must rerun the genAntsCss script to
 * generate a new CSS file. Otherwise, the CSS will not be updated in the
 * server-rendered initial page load and the style will "flash" before
 * hydrating.
 *
 * Note that in dev mode there is a problem with pages that are marked as "use
 * client", because they render *before* the layout which includes this config
 * provider. This means that the theme will not be applied to those pages in SSR.
 * See: https://github.com/vercel/next.js/issues/49557#issuecomment-1541984865
 */

const Theme: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider
      componentSize="middle"
      theme={{
        token: {
          // colorPrimary: '#00b96b',
          colorPrimary: '#1976D2',
          fontFamily: 'var(--inter)',
          colorBgContainer: '#fff',
          fontSize: 14,
          fontSizeHeading1: 16,
          screenSMMin: 601,
          screenSM: 601,
          screenXSMax: 600,
        },
        components: {
          Layout: {
            headerBg: '#fff',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default Theme;
