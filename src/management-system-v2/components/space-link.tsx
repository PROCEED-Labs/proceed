'use client';

import Link, { LinkProps } from 'next/link';
import { useEnvironment } from './auth-can';
import { ReactNode, forwardRef } from 'react';
import { spaceURL } from '@/lib/utils';

const SpaceLink = forwardRef<
  HTMLAnchorElement,
  { href: string; children: ReactNode } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof LinkProps
  > &
    LinkProps
>(({ href, children, ...linkProps }, ref) => {
  const space = useEnvironment();
  return (
    <Link ref={ref} {...linkProps} href={spaceURL(space, href)}>
      {children}
    </Link>
  );
});

export default SpaceLink;
