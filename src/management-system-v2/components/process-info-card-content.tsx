'use client';

import { Divider, Spin } from 'antd';
import React, { FC, Suspense } from 'react';
import Viewer from './bpmn-viewer';
import { ProcessListProcess } from './processes';
import { useUserPreferences } from '@/lib/user-preferences';
import ProceedLoadingIndicator from './loading-proceed';

type MetaDataContentType = {
  selectedElement?: ProcessListProcess;
};

const MetaDataContent: FC<MetaDataContentType> = ({ selectedElement }) => {
  const hydrated = useUserPreferences.use._hydrated();

  if (!hydrated) return null;

  return (
    // Viewer
    <div
      style={{
        height: '200px',
        width: '100%',
      }}
    >
      {selectedElement ? (
        <>
          {selectedElement.type !== 'folder' && (
            <>
              <Suspense
                fallback={
                  // <Spin size="large" tip="Loading Preview">
                  //   <div style={{ padding: 50 }} />
                  // </Spin>
                  <ProceedLoadingIndicator /* small={true} scale="50%" */ />
                }
              >
                <Viewer definitionId={selectedElement.id} reduceLogo={true} fitOnResize />
              </Suspense>

              <Divider style={{ width: '100%', marginLeft: '-20%' }} />
            </>
          )}

          <h3>Meta Data</h3>
          <h5>
            <b>Last Edited</b>
          </h5>
          <p>{/**generateDateString(selectedElement.lastEdited, true)*/}</p>
          <h5>
            <b>Created On</b>
          </h5>
          <p>{/**generateDateString(selectedElement.createdOn, true)*/}</p>
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
          <p>{selectedElement.description.value}</p>

          <Divider style={{ width: '100%', marginLeft: '-20%' }} />
          <h3>Access Rights</h3>
          <p>Test</p>
        </>
      ) : (
        <div>Please select a process.</div>
      )}
    </div>
  );
};

export default MetaDataContent;
