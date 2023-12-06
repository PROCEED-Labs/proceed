'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { Avatar, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferencesStore } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { ListUser } from '@/components/user-list';

const UserSidePanel: FC<{ user: ListUser | null }> = ({ user }) => {
  const setUserPreferences = useUserPreferencesStore((store) => store.addPreferences);
  const sidePanelOpen = useUserPreferencesStore(
    (store) => store.preferences['user-page-side-panel'].open,
  );
  const resizableElementRef = useRef<ResizableElementRefType>(null);

  // runs once the page is rehydrated on the client
  /* const [clientRehydrated, setClientRehydrated] = useState(false);
  useEffect(() => {
    setClientRehydrated(true);
  }, [clientRehydrated]); */

  const userFullName = user ? `${user.firstName.value} ${user.lastName.value}` : null;

  return (
    <ResizableElement
      initialWidth={
        sidePanelOpen
          ? useUserPreferencesStore.getState().preferences['user-page-side-panel'].width
          : 30
      }
      maxWidth={400}
      minWidth={200}
      style={{ position: 'relative' }}
      onWidthChange={(width) =>
        setUserPreferences({
          'user-page-side-panel': {
            open: sidePanelOpen,
            width: width,
          },
        })
      }
      ref={resizableElementRef}
    >
      <CollapsibleCard
        title={userFullName ?? ''}
        show={sidePanelOpen}
        collapsedWidth="30px"
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth =
            useUserPreferencesStore.getState().preferences['user-page-side-panel'].width;

          if (resizeCard) {
            if (sidePanelOpen) resizeCard(30);
            else resizeCard(sidepanelWidth);
          }

          setUserPreferences({
            'user-page-side-panel': {
              open: !sidePanelOpen,
              width: sidepanelWidth,
            },
          });
        }}
      >
        {user ? (
          <>
            <Avatar src={user.picture} size={60} style={{ marginBottom: 20 }}>
              {user.picture
                ? null
                : user.firstName.value.slice(0, 1) + user.lastName.value.slice(0, 1)}
            </Avatar>

            <Typography.Title>First Name</Typography.Title>
            <Typography.Text>{user.firstName.value}</Typography.Text>

            <Typography.Title>Last Name</Typography.Title>
            <Typography.Text>{user.lastName.value}</Typography.Text>

            <Typography.Title>Username</Typography.Title>
            <Typography.Text>{user.username.value}</Typography.Text>

            <Typography.Title>Email</Typography.Title>
            <Typography.Text>{user.email.value}</Typography.Text>
          </>
        ) : (
          <Typography.Text>Select an element.</Typography.Text>
        )}
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default UserSidePanel;
