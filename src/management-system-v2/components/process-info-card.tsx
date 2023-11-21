'use client';

import { generateDateString, getPreferences, addUserPreference } from '@/lib/utils';
import { Divider } from 'antd';
import React, { FC, Key, useEffect, useState } from 'react';
import Viewer from './bpmn-viewer';
import { ApiData } from '@/lib/fetch-data';
import CollapsibleCard from './collapsible-card';

type Processes = ApiData<'/process', 'get'>;

type MetaDataType = {
  data?: Processes;
  selection: Key[];
  triggerRerender?: () => void;
};

const MetaData: FC<MetaDataType> = ({ data, selection, triggerRerender }) => {
  /* NEEDS TO BE PLACED IN A FLEX CONTAINER */
  const prefs = getPreferences();
  const [showInfo, setShowInfo] = useState((prefs['show-process-meta-data'] || false) as boolean);

  const [showViewer, setShowViewer] = useState(showInfo);

  /* Fix for firefox: */

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (showInfo) {
      // Delay the rendering of Viewer
      timeoutId = setTimeout(() => {
        setShowViewer(true);
      }, 350); // Transition duration + 50ms
    } else {
      setShowViewer(false);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showInfo]);

  return (
    <div
      style={{
        justifySelf: 'flex-end',
        position: 'relative',
        flex: !showInfo ? 'none' : 1,
        transition: 'flex 0.3s ease-in-out',
        marginLeft: '20px',
      }}
    >
      <CollapsibleCard
        title="How to PROCEED?"
        show={showInfo}
        onCollapse={() => {
          addUserPreference({ 'show-process-meta-data': !showInfo });
          if (triggerRerender) triggerRerender();
          setShowInfo(!showInfo);
        }}
      >
        {/* Viewer */}
        <div
          style={{
            height: '200px',
            width: '100%',
          }}
        >
          {Boolean(selection.length) && showInfo ? (
            <>
              {showViewer && (
                <Viewer
                  selectedElement={data?.find((item) => item.definitionId === selection[0])}
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
              <p>{data?.find((item) => item.definitionId === selection[0])?.description}</p>

              <Divider style={{ width: '140%', marginLeft: '-20%' }} />
              <h3>Access Rights</h3>
              <p>Test</p>
            </>
          ) : (
            showInfo && <div>Please select a process.</div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
};

export default MetaData;
