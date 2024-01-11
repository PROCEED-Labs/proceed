'use client';

import { generateDateString } from '@/lib/utils';
import { Divider } from 'antd';
import React, { FC, Key } from 'react';
import Viewer from './bpmn-viewer';
import { ProcessListProcess } from './processes';
import { useUserPreferences } from '@/lib/user-preferences';

type MetaDataContentType = {
  data?: ProcessListProcess[];
  selection: Key[];
};

const MetaDataContent: FC<MetaDataContentType> = ({ data, selection }) => {
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
  );
};

export default MetaDataContent;
