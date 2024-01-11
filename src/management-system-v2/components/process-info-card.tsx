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

const getWidth = () => useUserPreferences.getState().preferences['process-meta-data'].width;

/** NEEDS TO BE PLACED IN A FLEX CONTAINER */
const MetaData: FC<MetaDataType> = ({ data, selection }) => {
  const addPreferences = useUserPreferences.use.addPreferences();
  const showInfo = useUserPreferences((store) => store.preferences['process-meta-data'].open);
  const hydrated = useUserPreferences.use._hydrated();

  const collapseCard = () => {
    const resizeCard = resizableElementRef.current;
    const sidepanelWidth = useUserPreferences.getState().preferences['process-meta-data'].width;

    if (resizeCard) {
      if (showInfo) resizeCard(30);
      else resizeCard(sidepanelWidth);
    }
    addPreferences({
      'process-meta-data': {
        open: !showInfo,
        width: sidepanelWidth,
      },
    });
  };

  /* Necessary for Firefox BPMN.js Viewer fix */
  /* const [showViewer, setShowViewer] = useState(showInfo); */

  /* Fix for firefox: */
  /* useEffect(() => {
    const panelWidth = getWidth();
    let timeoutId: ReturnType<typeof setTimeout>;
    if (showInfo) {
      // Delay the rendering of Viewer
      timeoutId = setTimeout(() => {
        setShowViewer(true);

        //  set width of parent component (resizable element) to 450 which is the desired with of the collapsed card
        if (resizableElementRef.current) {
          resizableElementRef.current(panelWidth);
        }
      }, 350); // Transition duration + 50ms
    } else {
      setShowViewer(false);

      //  set width of parent component (resizable element) to 40 which is the desired with of the collapsed card
      if (resizableElementRef.current) {
        resizableElementRef.current(30);
      }
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showInfo]); */

  const resizableElementRef = useRef<ResizableElementRefType>(null);

  if (!hydrated) return null;

  return (
    <ResizableElement
      initialWidth={
        showInfo ? useUserPreferences.getState().preferences['process-meta-data'].width : 30
      }
      minWidth={300}
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
    >
      <CollapsibleCard
        title={
          selection.length
            ? data?.find((item) => item.definitionId === selection[0])?.definitionName.value!
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

export default MetaData;
