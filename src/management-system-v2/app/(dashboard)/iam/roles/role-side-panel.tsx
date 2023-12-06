'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { Alert, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferencesStore } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { FilteredRole } from './role-page';

const RoleSidePanel: FC<{ role: FilteredRole | null }> = ({ role }) => {
  const setUserPreferences = useUserPreferencesStore((store) => store.addPreferences);
  const sidePanelOpen = useUserPreferencesStore(
    (store) => store.preferences['role-page-side-panel'].open,
  );
  const resizableElementRef = useRef<ResizableElementRefType>(null);

  return (
    <ResizableElement
      initialWidth={
        sidePanelOpen
          ? useUserPreferencesStore.getState().preferences['role-page-side-panel'].width
          : 30
      }
      minWidth={300}
      maxWidth={600}
      style={{ position: 'relative' }}
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
        title={role ? role.name.value : ''}
        show={sidePanelOpen}
        collapsedWidth="30px"
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth =
            useUserPreferencesStore.getState().preferences['role-page-side-panel'].width;

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
            <Typography.Text>{role.lastEdited}</Typography.Text>

            <Typography.Title>Created On</Typography.Title>
            <Typography.Text>{role.createdOn}</Typography.Text>
          </>
        ) : (
          <Typography.Text>Select a role.</Typography.Text>
        )}
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default RoleSidePanel;
