'use client';

import { generateDateString } from '@/lib/utils';
import { Divider } from 'antd';
import React, { FC, Key, useRef } from 'react';
import Viewer from './bpmn-viewer';
import CollapsibleCard from './collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import { ProcessListProcess } from './processes';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';

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
      initialWidth={showInfo ? getWidth() : 30}
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
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth = getWidth();

          if (resizeCard) {
            if (showInfo) resizeCard({ width: 30, minWidth: 30, maxWidth: 30 });
            else resizeCard({ width: sidepanelWidth, minWidth: 300, maxWidth: 600 });
          }
          addPreferences({
            'process-meta-data': {
              open: !showInfo,
              width: sidepanelWidth,
            },
          });
        }}
      >
        {/* Viewer */}
        <div
          style={{
            height: '200px',
            width: '100%',
          }}
        >
          {Boolean(selection.length) ? (
            <>
              <Viewer definitionId={selection[0] as string} reduceLogo={true} fitOnResize />

              <Divider style={{ width: '100%', marginLeft: '-20%' }} />
              <h3>Meta Data</h3>
              <h5>
                <b>Last Edited</b>
              </h5>
              <p>
                {generateDateString(
                  data?.find((item) => item.definitionId === selection[0])?.lastEdited,
                  true,
                )}
              </p>
              <h5>
                <b>Created On</b>
              </h5>
              <p>
                {generateDateString(
                  data?.find((item) => item.definitionId === selection[0])?.createdOn,
                  false,
                )}
              </p>
              <h5>
                <b>File Size</b>
              </h5>
              <p>X KB</p>
              <h5>
                <b>Owner</b>
              </h5>
              <p>Obi Wan Kenobi</p>
              <h5>
                <b>Description</b>
              </h5>
              <p>{data?.find((item) => item.definitionId === selection[0])?.description.value}</p>

              <Divider style={{ width: '100%', marginLeft: '-20%' }} />
              <h3>Access Rights</h3>
              <p>Test</p>
            </>
          ) : (
            <div>Please select a process.</div>
          )}
        </div>
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default MetaData;
