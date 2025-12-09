'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, use } from 'react';
import { getCustomLinksStatus } from './server-actions';
import { Badge } from 'antd';
import { CustomNavigationLink } from './custom-link';
import { isUserErrorResponse } from '../server-error-handling/user-error';

type LinkState = (CustomNavigationLink & { status?: boolean })[];

const LinkStateProvider = createContext<LinkState>([]);

export function CustomLinkStateProvider({
  spaceId,
  children,
}: {
  spaceId: string;
  children: React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: [spaceId, 'custom-links-state'],
    queryFn: async () => {
      const response = await getCustomLinksStatus(spaceId);
      if (isUserErrorResponse(response)) throw response.error;
      return response;
    },
    refetchInterval: 15_000,
  });

  return <LinkStateProvider.Provider value={data ?? []}>{children}</LinkStateProvider.Provider>;
}

export function ClientLinkState({
  serverState,
  link,
}: {
  serverState: React.ReactNode;
  link: CustomNavigationLink;
}) {
  const linkState = use(LinkStateProvider);
  const linkData = linkState.find((l) => l.address === link.address && l.topic === link.topic);

  if (linkData) {
    return (
      <Badge style={{ marginLeft: '0.25rem' }} status={linkData.status ? 'success' : 'error'} />
    );
  } else {
    return serverState;
  }
}
