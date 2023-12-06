'use client';

import { generateDateString } from '@/lib/utils';
import { Divider } from 'antd';
import React, { FC, Key, useEffect, useRef, useState } from 'react';
import Viewer from './bpmn-viewer';
import { ApiData } from '@/lib/fetch-data';
import CollapsibleCard from './collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import { ProcessListProcess } from './processes';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';

type MetaDataType = {
  data?: ProcessListProcess[];
  selection: Key[];
};

const MetaData: FC<MetaDataType> = ({ data, selection }) => {
  /* NEEDS TO BE PLACED IN A FLEX CONTAINER */

  const { preferences, addPreferences } = useUserPreferences();

  const showInfo = preferences['show-process-meta-data'];
  // const [showInfo, setShowInfo] = useState(preferences['show-process-meta-data']);

  /* Necessary for Firefox BPMN.js Viewer fix */
  const [showViewer, setShowViewer] = useState(showInfo);

  /* Fix for firefox: */
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (showInfo) {
      // Delay the rendering of Viewer
      timeoutId = setTimeout(() => {
        setShowViewer(true);

        //  set width of parent component (resizable element) to 450 which is the desired with of the collapsed card
        if (resizableElementRef.current) {
          resizableElementRef.current(300);
        }
      }, 350); // Transition duration + 50ms
    } else {
      setShowViewer(false);

      //  set width of parent component (resizable element) to 40 which is the desired with of the collapsed card
      if (resizableElementRef.current) {
        resizableElementRef.current(40);
      }
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showInfo]);

  const resizableElementRef = useRef<ResizableElementRefType>(null);
  return (
    <ResizableElement
      initialWidth={300}
      minWidth={300}
      maxWidth={600}
      style={{
        // position: 'relative',
        // flex: !showViewer ? 'none' : 1,
        transition: 'flex 0.3s ease-in-out',
        marginLeft: '20px',
        maxWidth: '33%',
      }}
      ref={resizableElementRef}
    >
      <CollapsibleCard
        title={
          selection.length
            ? data?.find((item) => item.definitionId === selection[0])?.definitionName.value!
            : 'How to PROCEED?'
        }
        show={showViewer}
        onCollapse={() => {
          addPreferences({ 'show-process-meta-data': !showViewer });
        }}
      >
        {/* Viewer */}
        <div
          style={{
            height: '200px',
            width: '100%',
          }}
        >
          {Boolean(selection.length) && showViewer ? (
            <>
              {showViewer && (
                <Viewer
                  selectedElementId={
                    data?.find((item) => item.definitionId === selection[0])?.definitionId
                  }
                  reduceLogo={true}
                />
              )}

              <Divider style={{ width: '140%', marginLeft: '-20%' }} />
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

              <Divider style={{ width: '140%', marginLeft: '-20%' }} />
              <h3>Access Rights</h3>
              <p>Test</p>
            </>
          ) : (
            showViewer && <div>Please select a process.</div>
          )}
        </div>
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default MetaData;
