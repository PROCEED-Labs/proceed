'use client';

import { generateDateString } from '@/lib/utils';
import { Divider } from 'antd';
import React, {
  FC,
  Key,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import Viewer from './bpmn-viewer';
import CollapsibleCard from './collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import { ProcessListProcess } from './processes';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';
import MetaDataContent from './process-info-card-content';

type MetaDataType = {
  data?: ProcessListProcess[];
  selection: Key[];
};
export type MetaPanelRefType = () => void;

/** NEEDS TO BE PLACED IN A FLEX CONTAINER */
const MetaData: FC<MetaDataType> = ({ data, selection }, ref) => {
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
        title={
          selection.length
            ? data?.find((item) => item.id === selection[0])?.name.value!
            : 'How to PROCEED?'
        }
        show={showInfo}
        onCollapse={collapseCard}
      >
        <MetaDataContent data={data} selection={selection} />
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default forwardRef(MetaData);
