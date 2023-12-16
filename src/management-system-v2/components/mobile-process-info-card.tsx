'use client';

import { generateDateString } from '@/lib/utils';
import { Divider, Drawer } from 'antd';
import React, { FC, Key, useEffect, useRef, useState } from 'react';
import Viewer from './bpmn-viewer';
import { ApiData } from '@/lib/fetch-data';
import { useUserPreferences } from '@/lib/user-preferences';
import { ProcessListProcess } from './processes';

type MobileMetaDataType = {
  data?: ProcessListProcess[];
  selection: Key[];
};

const MobileMetaData: FC<MobileMetaDataType> = ({ data, selection }) => {
  const hydrated = useUserPreferences.use._hydrated();

  if (!hydrated) return null;

  return (
    <>
      {/* Viewer */}
      <div
        style={{
          height: '200px',
          width: '100%',
        }}
      >
        <Viewer
          selectedElementId={
            data?.find((item) => item.definitionId === selection[0])?.definitionId
          }
          reduceLogo={true}
          resizeOnWidthChange={true}
        />

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
      </div>
    </>
  );
};

export default MobileMetaData;
