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
  const space = useEnvironment();
  return (
    <Link {...linkProps} href={spaceURL(space, href)}>
      {children}
    </Link>
  );
};

export default SpaceLink;
