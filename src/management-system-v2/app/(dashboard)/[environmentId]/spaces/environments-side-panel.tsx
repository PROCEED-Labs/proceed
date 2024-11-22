'use client';

import { FC, useRef } from 'react';
import { Alert, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { FilteredEnvironment } from './environemnts-page';

const EnvironmentSidePanel: FC<{ environment: FilteredEnvironment | undefined }> = ({
  environment,
}) => {
  const setUserPreferences = useUserPreferences.use.addPreferences();
  const sidePanelOpen = useUserPreferences(
    (store) => store.preferences['environments-page-side-panel'].open,
  );
  const hydrated = useUserPreferences.use._hydrated();

  const resizableElementRef = useRef<ResizableElementRefType>(null);

  if (!hydrated) return null;
  return (
    <ResizableElement
      initialWidth={
        sidePanelOpen
          ? useUserPreferences.getState().preferences['environments-page-side-panel'].width
          : 30
      }
      minWidth={300}
      maxWidth={600}
      style={{ position: 'relative' }}
      onWidthChange={(width) =>
        setUserPreferences({
          'environments-page-side-panel': {
            open: sidePanelOpen,
            width: width,
          },
        })
      }
      ref={resizableElementRef}
    >
      <CollapsibleCard
        title={environment?.name.value ?? ''}
        show={sidePanelOpen}
        collapsedWidth="30px"
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth =
            useUserPreferences.getState().preferences['environments-page-side-panel'].width;

          if (resizeCard) {
            if (sidePanelOpen) resizeCard(30);
            else resizeCard(sidepanelWidth);
          }
          setUserPreferences({
            'environments-page-side-panel': {
              open: !sidePanelOpen,
              width: sidepanelWidth,
            },
          });
        }}
      >
        {environment ? (
          <>
            <Typography.Title>Description</Typography.Title>
            <Typography.Text>{environment.description.value}</Typography.Text>

            <Typography.Title>Members</Typography.Title>
            <Typography.Text>TODO</Typography.Text>

            <Typography.Title>Created On</Typography.Title>
            <Typography.Text>TODO</Typography.Text>
          </>
        ) : (
          <Typography.Text>Select an environment.</Typography.Text>
        )}
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default EnvironmentSidePanel;
