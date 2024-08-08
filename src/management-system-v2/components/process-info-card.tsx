'use client';

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import CollapsibleCard from './collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import { ProcessListProcess } from './processes';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';
import MetaDataContent from './process-info-card-content';

type MetaDataType = {
  selectedElement?: ProcessListProcess;
};
export type MetaPanelRefType = () => void;

/** NEEDS TO BE PLACED IN A FLEX CONTAINER */
const MetaData = forwardRef<() => void, MetaDataType>(({ selectedElement }, ref) => {
  const addPreferences = useUserPreferences.use.addPreferences();
  const getWidth = () => useUserPreferences.getState().preferences['process-meta-data'].width;
  const showInfo = useUserPreferences((store) => store.preferences['process-meta-data'].open);
  const hydrated = useUserPreferences.use._hydrated();

  const collapseCard = () => {
    const resizeCard = resizableElementRef.current;
    const sidepanelWidth = getWidth();

    if (resizeCard) {
      if (showInfo) resizeCard({ width: 30, minWidth: 30, maxWidth: 30 });
      else resizeCard({ width: sidepanelWidth, minWidth: 300, maxWidth: 600 });
    }
    addPreferences({
      'process-meta-data': {
        open: !useUserPreferences.getState().preferences['process-meta-data'].open,
        width: sidepanelWidth,
      },
    });
  };

  useImperativeHandle(ref, () => collapseCard);

  const resizableElementRef = useRef<ResizableElementRefType>(null);

  if (!hydrated) return null;

  return (
    <ResizableElement
      initialWidth={
        showInfo ? useUserPreferences.getState().preferences['process-meta-data'].width : 30
      }
      minWidth={showInfo ? 300 : 30}
      maxWidth={600}
      style={{
        // position: 'relative',
        // flex: !showViewer ? 'none' : 1,
        transition: 'flex 0.3s ease-in-out',
        marginLeft: '20px',
        maxWidth: '33%',
      }}
      onWidthChange={(width) =>
        addPreferences({
          'process-meta-data': {
            open: showInfo,
            width: width,
          },
        })
      }
      ref={resizableElementRef}
      lock={!showInfo}
    >
      <CollapsibleCard
        title={selectedElement?.name.value ?? 'How to PROCEED?'}
        show={showInfo}
        onCollapse={collapseCard}
      >
        <MetaDataContent selectedElement={selectedElement} />
      </CollapsibleCard>
    </ResizableElement>
  );
});

MetaData.displayName = 'MetaData';

export default MetaData;
