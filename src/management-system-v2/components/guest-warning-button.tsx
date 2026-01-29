'use client';

import { App, theme } from 'antd';
import SpaceLink from './space-link';
import { HTMLAttributes, forwardRef } from 'react';

const GuestWarningButton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const app = App.useApp();
    const { token } = theme.useToken();

    return (
      <div
        style={{ display: 'inline-block' }}
        ref={ref}
        onClick={() =>
          app.modal.warning({
            title: null,
            footer: null,
            icon: null,
            styles: {
              content: {
                background: token.colorWarningBg,
                borderColor: token.colorWarningBorder,
                padding: '8px 12px',
              },
              mask: { backdropFilter: 'blur(10px)' },
            },
            closable: false,
            maskClosable: true,
            content: (
              <>
                To store and change settings,{' '}
                <SpaceLink href={'/signin'}> please log in as user.</SpaceLink>
              </>
            ),
          })
        }
        {...props}
      />
    );
  },
);

GuestWarningButton.displayName = 'GuestWarningButton';

export default GuestWarningButton;
