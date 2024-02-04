'use client';

import { Dispatch, FC, PropsWithChildren, SetStateAction, useRef, useState } from 'react';
import { Avatar, Drawer, Grid, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { ListUser } from '@/components/user-list';
import UserSiderContent from './user-sider-content'


type UserSidePanelProps = PropsWithChildren<{
  user: ListUser | null;
  setShowMobileUserSider: Dispatch<SetStateAction<boolean>>;
  showMobileUserSider: boolean;
}>

const UserSidePanel: FC<UserSidePanelProps> = ({
  user,
  setShowMobileUserSider,
  showMobileUserSider
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
    setShowMobileUserSider(false)
  }

  if (!hydrated) return null;
  return (
    <>
    {breakpoint.xl ? (
      <ResizableElement
      initialWidth={
        sidePanelOpen ? useUserPreferences.getState().preferences['user-page-side-panel'].width : 30
      }
      minWidth={sidePanelOpen ? 300 : 30}
      maxWidth={600}
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
        title={userFullName ?? 'How to PROCEED?'}
        show={sidePanelOpen}
        collapsedWidth="30px"
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth =
            useUserPreferences.getState().preferences['user-page-side-panel'].width;

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
        <UserSiderContent user={user}/>
      </CollapsibleCard>
    </ResizableElement>
    ):
    (
      <Drawer
      onClose={closeMobileUserSider}
      title={
        <span>{userFullName}</span>
      }
        open={showMobileUserSider}
      >
        <UserSiderContent user={user}/>
    </Drawer>
  )}
  </>
  );
};

export default UserSidePanel;
