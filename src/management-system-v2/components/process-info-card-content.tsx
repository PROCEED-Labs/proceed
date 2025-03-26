'use client';

import { Descriptions, Divider, Spin } from 'antd';
import React, { FC, Suspense } from 'react';
import Viewer from './bpmn-viewer';
import { canDoActionOnResource, ProcessListProcess } from './processes';
import { useUserPreferences } from '@/lib/user-preferences';
import ProceedLoadingIndicator from './loading-proceed';
import { generateDateString } from '@/lib/utils';
import { useAbilityStore } from '@/lib/abilityStore';

type MetaDataContentType = {
  selectedElement?: ProcessListProcess;
};

const MetaDataContent: FC<MetaDataContentType> = ({ selectedElement }) => {
  const hydrated = useUserPreferences.use._hydrated();

  const ability = useAbilityStore((state) => state.ability);

  const canDelete = selectedElement && canDoActionOnResource([selectedElement], 'delete', ability);
  const canEdit = selectedElement && canDoActionOnResource([selectedElement], 'update', ability);

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
          <p>{generateDateString(selectedElement.lastEditedOn!, true)}</p>
          <h5>
            <b>Created On</b>
          </h5>
          <p>{generateDateString(selectedElement.createdOn!, true)}</p>
          <h5>
            <b>Owner</b>
          </h5>
          <p>{/* TODO: once userID-userName Mapping is done */}</p>
          <h5>
            <b>Description</b>
          </h5>
          <p>{selectedElement.description.value}</p>

          <Divider style={{ width: '100%', marginLeft: '-20%' }} />
          {/* <h3>Access Rights</h3> */}
          <Descriptions
            title={'Access Rights'}
            bordered
            size="small"
            layout="horizontal"
            // colon={false}
          >
            <Descriptions.Item span={3} label="View the Process:">
              ✅
            </Descriptions.Item>
            <Descriptions.Item span={3} label="Edit the Process:">
              {canEdit ? '✅' : '❌'}
            </Descriptions.Item>
            <Descriptions.Item span={3} label="Delete the Process">
              {canDelete ? '✅' : '❌'}
            </Descriptions.Item>
          </Descriptions>
        </>
      ) : (
        <div>Please select a process.</div>
      )}
    </div>
  );
};

export default MetaDataContent;
