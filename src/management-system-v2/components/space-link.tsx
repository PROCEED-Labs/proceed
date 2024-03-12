'use client';

import Link, { LinkProps } from 'next/link';
import { useEnvironment } from './auth-can';
import { ReactNode } from 'react';
import { spaceURL } from '@/lib/utils';

const SpaceLink = ({
  href,
  children,
  ...linkProps
}: { href: string; children: ReactNode } & LinkProps) => {
  const spaceId = useEnvironment();
  return (
    <Link {...linkProps} href={spaceURL(spaceId, href)}>
      {children}
    </Link>
  );
};

export default SpaceLink;
