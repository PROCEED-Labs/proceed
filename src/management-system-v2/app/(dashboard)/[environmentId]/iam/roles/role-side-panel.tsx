'use client';

import { Dispatch, FC, PropsWithChildren, SetStateAction, useRef } from 'react';
import { Alert, Drawer, Grid, Space, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { FilteredRole } from './role-page';
import UserAvatar from '@/components/user-avatar';
import { userRepresentation } from '@/lib/utils';
import { RoleWithMembers } from '@/lib/data/role-schema';

export type MemberInfo = RoleWithMembers['members'][number];

const RoleContent: FC<{
  role: (Omit<FilteredRole, 'members'> & { members: MemberInfo[] }) | null;
}> = ({ role }) => {
  return (
    <>
      {role ? (
        <>
          {role.note && (
            <>
              <Typography.Title>Note</Typography.Title>
              <Typography.Text>
                <Alert type="warning" description={role.note} />
              </Typography.Text>
            </>
          )}

          {role.description && (
            <>
              <Typography.Title>Description</Typography.Title>
              <Typography.Text>{role.description}</Typography.Text>
            </>
          )}

          <Typography.Title>Members</Typography.Title>
          <Typography.Text>{role.members.length}</Typography.Text>

          <Typography.Title>Last Edited</Typography.Title>
          <Typography.Text>{role.lastEditedOn.toUTCString()}</Typography.Text>

          <Typography.Title>Created On</Typography.Title>
          <Typography.Text>{role.createdOn.toUTCString()}</Typography.Text>

          {role.members.length > 0 && (
            <>
              <Typography.Title>Members</Typography.Title>
              {role.members.map((user) => (
                <Space key={user.id}>
                  <UserAvatar user={user} avatarProps={{ size: 30 }} />
                  <Typography.Text>{userRepresentation(user)}</Typography.Text>
                </Space>
              ))}
            </>
          )}
        </>
      ) : (
        <Typography.Text>Select a role.</Typography.Text>
      )}
    </>
  );
};

type RoleSidePanelProps = PropsWithChildren<{
  role: (FilteredRole & { members: MemberInfo[] }) | null;
  setShowMobileRoleSider: Dispatch<SetStateAction<boolean>>;
  showMobileRoleSider: boolean;
}>;

const RoleSidePanel: FC<RoleSidePanelProps> = ({
  role,
  setShowMobileRoleSider,
  showMobileRoleSider,
}) => {
  const setUserPreferences = useUserPreferences.use.addPreferences();
  const sidePanelOpen = useUserPreferences(
    (store) => store.preferences['role-page-side-panel'].open,
  );
  const breakpoint = Grid.useBreakpoint();
  const hydrated = useUserPreferences.use._hydrated();

  const resizableElementRef = useRef<ResizableElementRefType>(null);

  const closeMobileRoleSider = () => {
    setShowMobileRoleSider(false);
  };

  if (!hydrated) return null;
  return breakpoint.xl ? (
    <ResizableElement
      initialWidth={
        sidePanelOpen ? useUserPreferences.getState().preferences['role-page-side-panel'].width : 30
      }
      minWidth={sidePanelOpen ? 300 : 30}
      maxWidth={600}
      style={{ position: 'relative', marginLeft: '20px' }}
      onWidthChange={(width) =>
        setUserPreferences({
          'role-page-side-panel': {
            open: sidePanelOpen,
            width: width,
          },
        })
      }
      ref={resizableElementRef}
    >
      <CollapsibleCard
        title={role?.name.value ?? 'How to PROCEED?'}
        show={sidePanelOpen}
        collapsedWidth="30px"
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth =
            useUserPreferences.getState().preferences['role-page-side-panel'].width;

          if (resizeCard) {
            if (sidePanelOpen) resizeCard(30);
            else resizeCard(sidepanelWidth);
          }
          setUserPreferences({
            'role-page-side-panel': {
              open: !sidePanelOpen,
              width: sidepanelWidth,
            },
          });
        }}
      >
        <RoleContent role={role} />
      </CollapsibleCard>
    </ResizableElement>
  ) : (
    <Drawer
      onClose={closeMobileRoleSider}
      title={role ? role.name.value : ''}
      open={showMobileRoleSider}
    >
      <RoleContent role={role} />
    </Drawer>
  );
};

export default RoleSidePanel;
