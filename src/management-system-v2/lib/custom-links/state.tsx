import { checkCustomLinkStatus } from './get-link-state';
import { Badge, Spin } from 'antd';
import { ClientLinkState } from './client-state';
import { Suspense } from 'react';
import { CustomNavigationLink } from './custom-link';

async function ServerLinkStatus({ link }: { link: CustomNavigationLink }) {
  const status = await checkCustomLinkStatus(link);
  return <Badge style={{ marginLeft: '0.25rem' }} status={status ? 'success' : 'error'} />;
}

export function CustomLink({ link }: { link: CustomNavigationLink }) {
  const children = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        <span
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {link.name}
        </span>
      </div>

      {link.showStatus && (
        <ClientLinkState
          link={link}
          serverState={
            <Suspense fallback={<Spin spinning />}>
              <ServerLinkStatus link={link} />
            </Suspense>
          }
        />
      )}
    </div>
  );

  if (link.clickable) {
    return (
      <a href={link.address} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
        {children}
      </a>
    );
  } else {
    return children;
  }
}
