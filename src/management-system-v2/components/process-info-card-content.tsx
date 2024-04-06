'use client';

import { generateDateString } from '@/lib/utils';
import { Divider } from 'antd';
import React, { FC } from 'react';
import Viewer from './bpmn-viewer';
import { ProcessListProcess } from './processes';
import { useUserPreferences } from '@/lib/user-preferences';

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
              <Viewer definitionId={selectedElement.id} reduceLogo={true} fitOnResize />
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
