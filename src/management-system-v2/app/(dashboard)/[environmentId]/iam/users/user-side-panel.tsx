'use client';

import { Dispatch, FC, PropsWithChildren, SetStateAction, useRef } from 'react';
import { Drawer, Grid, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { ListUser } from '@/components/user-list';
import { Role } from '@/lib/data/role-schema';
import SpaceLink from '@/components/space-link';
import UserAvatar from '@/components/user-avatar';

const UserSiderContent: FC<{ user: (ListUser & { roles?: Role[] }) | null }> = ({ user }) => {
  if (!user) return <Typography.Text>Select an element.</Typography.Text>;
  return (
    <>
      <UserAvatar
        user={{ ...user, firstName: user.firstName.value, lastName: user.lastName.value }}
        size={60}
        style={{
          marginBottom: '1rem',
        }}
      />

      <Typography.Title>First Name</Typography.Title>
      <Typography.Text>{user.firstName.value}</Typography.Text>

      <Typography.Title>Last Name</Typography.Title>
      <Typography.Text>{user.lastName.value}</Typography.Text>

      <Typography.Title>Username</Typography.Title>
      <Typography.Text>{user.username.value}</Typography.Text>

      <Typography.Title>Email</Typography.Title>
      <Typography.Text>{user.email.value}</Typography.Text>

      {user.roles && user.roles.length > 0 && (
        <>
          <Typography.Title>Roles</Typography.Title>
          {user.roles.map((role) => (
            <SpaceLink
              key={role.id}
              href={`/iam/roles/${role.id}`}
              style={{
                display: 'block',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {role.name}
            </SpaceLink>
          ))}
        </>
      )}
    </>
  );
};

type UserSidePanelProps = PropsWithChildren<{
  user: (ListUser & { roles?: Role[] }) | null;
  setShowMobileUserSider: Dispatch<SetStateAction<boolean>>;
  showMobileUserSider: boolean;
}>;

const UserSidePanel: FC<UserSidePanelProps> = ({
  user,
  setShowMobileUserSider,
  showMobileUserSider,
}) => {
  const setUserPreferences = useUserPreferences.use.addPreferences();
  const hydrated = useUserPreferences.use._hydrated();
  const sidePanelOpen = useUserPreferences(
    (store) => store.preferences['user-page-side-panel'].open,
  );
  const resizableElementRef = useRef<ResizableElementRefType>(null);
  const breakpoint = Grid.useBreakpoint();
  const userFullName = user ? `${user.firstName.value} ${user.lastName.value}` : null;

  const closeMobileUserSider = () => {
    setShowMobileUserSider(false);
  };

  if (!hydrated) return null;
  return (
    <>
      {breakpoint.xl ? (
        <ResizableElement
          initialWidth={
            sidePanelOpen
              ? useUserPreferences.getState().preferences['user-page-side-panel'].width
              : 30
          }
          minWidth={sidePanelOpen ? 300 : 30}
          maxWidth={600}
          style={{ position: 'relative', marginLeft: '20px' }}
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
            title={userFullName ?? 'How to PROCEED?'}
            show={sidePanelOpen}
            collapsedWidth="30px"
            onCollapse={() => {
              const resizeCard = resizableElementRef.current;
              const sidepanelWidth =
                useUserPreferences.getState().preferences['user-page-side-panel'].width;

              if (resizeCard) {
                if (sidePanelOpen) resizeCard({ width: 30, minWidth: 30 });
                else resizeCard({ width: sidepanelWidth, minWidth: 300 });
              }

              setUserPreferences({
                'user-page-side-panel': {
                  open: !sidePanelOpen,
                  width: sidepanelWidth,
                },
              });
            }}
          >
            <UserSiderContent user={user} />
          </CollapsibleCard>
        </ResizableElement>
      ) : (
        <Drawer
          onClose={closeMobileUserSider}
          title={<span>{userFullName}</span>}
          open={showMobileUserSider}
        >
          <UserSiderContent user={user} />
        </Drawer>
      )}
    </>
  );
};

export default UserSidePanel;
