'use client';

import { Divider } from 'antd';
import { FC, Suspense } from 'react';
import Viewer from './bpmn-viewer';
import { ProcessListProcess } from './processes/types';
import ProceedLoadingIndicator from './loading-proceed';
import { generateDateString } from '@/lib/utils';
import { ProcessDescription } from './process-description';

type MetaDataContentType = {
  selectedElement?: ProcessListProcess;
};

const MetaDataContent: FC<MetaDataContentType> = ({ selectedElement }) => {
  console.log('MetaDataContent', selectedElement?.description.value);
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
          <p></p>

          <h5>
            <b>Created On</b>
          </h5>
          <p></p>

          <h5>
            <b>Created By</b>
          </h5>
          <p></p>

          <h5>
            <b>Responsible Person (Process Owner)</b>
          </h5>
          <p></p>

          <h5>
            <b>Description</b>
          </h5>
          <ProcessDescription initialValue={selectedElement.description.value} />

          {selectedElement.type === 'process' && (
            <>
              <h5>
                <b>ID</b>
              </h5>
              <p>{selectedElement.userDefinedId ?? 'undefined'}</p>
            </>
          )}
        </>
      ) : (
        <div>Please select a process.</div>
      )}
    </div>
  );
};

export default MetaDataContent;
