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
  const resizeCard = resizableElementRef.current;

  // runs once the page is rehydrated on the client
  const [clientRehydrated, setClientRehydrated] = useState(false);
  useEffect(() => {
    setClientRehydrated(true);
  }, [clientRehydrated]);

  return (
    <ResizableElement
      initialWidth={
        sidePanelOpen
          ? useUserPreferencesStore.getState().preferences['role-page-side-panel'].width
          : 30
      }
      maxWidth={400}
      minWidth={200}
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
          const sidepanelWidth =
            useUserPreferencesStore.getState().preferences['role-page-side-panel'].width;
          setUserPreferences({
            'role-page-side-panel': {
              open: !sidePanelOpen,
              width: sidepanelWidth,
            },
          });

          if (!resizeCard) return;

          if (sidePanelOpen) resizeCard(30);
          else resizeCard(sidepanelWidth);
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
