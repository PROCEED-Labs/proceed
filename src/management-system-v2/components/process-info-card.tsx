'use client';

import { generateDateString, getPreferences, addUserPreference } from '@/lib/utils';
import { Card, Divider, Button } from 'antd';
import { DoubleRightOutlined, DoubleLeftOutlined } from '@ant-design/icons';
import React, { FC, Key, use, useCallback, useEffect, useState } from 'react';
import Viewer from './bpmn-viewer';
import classNames from 'classnames';
import { ApiData } from '@/lib/fetch-data';
import { useUserPreferences } from '@/lib/user-preferences';
import useStore from '@/lib/useStore';

type Processes = ApiData<'/process', 'get'>;

type MetaDataType = {
  data?: Processes;
  selection: Key[];
  triggerRerender?: () => void;
};

const MetaData: FC<MetaDataType> = ({ data, selection, triggerRerender }) => {
  /* NEEDS TO BE PLACED IN A FLEX CONTAINER */

  const { preferences } = useStore(useUserPreferences, (state) => state);

  // const preferences = useStore(useUserPreferences, (state) => state.preferences);
  // const addPreferences = useStore(useUserPreferences, (state) => state.addPreferences);

  // const preferences = useUserPreferences((state) => state.preferences);
  const addPreferences = useUserPreferences((state) => state.addPreferences);

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
      }, 350); // Transition duration + 50ms
    } else {
      setShowViewer(false);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showInfo]);

  return (
    <>
      <div
        style={{
          justifySelf: 'flex-end',
          position: 'relative',
          flex: !showInfo ? 'none' : 1,
          transition: 'flex 0.3s ease-in-out',
          width: 30,
          marginRight: '15px',
        }}
      >
        {!showInfo && (
          <Button
            type="text"
            style={{
              padding: '2px 2px',
              position: 'absolute',
              right: '-16px',
              top: '10px',
              zIndex: 100,
            }}
            onClick={() => {
              addPreferences({ 'show-process-meta-data': !showInfo });
              if (triggerRerender) triggerRerender();
            }}
          >
            <DoubleLeftOutlined />
          </Button>
        )}
        <Card
          className={classNames({ 'Hide-Scroll-Bar': !showInfo })}
          style={{
            marginLeft: '20px',
            scrollBehavior: 'smooth',
            overflowY: 'scroll',
            height: '100%',
            scrollbarWidth: 'none',
            width: '100%',
          }}
          title={
            <>
              <Button
                type="text"
                style={{
                  padding: '2px',
                  marginRight: '4px',
                }}
                onClick={() => {
                  addPreferences({
                    'show-process-meta-data': !showInfo,
                  });
                  if (triggerRerender) triggerRerender();
                }}
              >
                <DoubleRightOutlined />
              </Button>
              {selection.length
                ? data?.find((item) => item.definitionId === selection[0])?.definitionName
                : 'How to PROCEED?'}
            </>
          }
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
        </Card>
      </div>
    </>
  );
};

export default MetaData;
