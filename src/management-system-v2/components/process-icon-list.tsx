'use client';

import React, { Dispatch, FC, Key, SetStateAction } from 'react';

import TabCard from './tabcard-model-metadata';

import ScrollBar from './scrollbar';
import { ProcessListProcess } from './processes';

type IconViewProps = {
  data?: ProcessListProcess[];
  selection: Key[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
};

const IconView: FC<IconViewProps> = ({ data, selection, setSelectionElements }) => {
  return (
    <>
      <ScrollBar width="12px">
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            justifyContent: 'space-between',
            gridGap: '20px',
          }}
        >
          {data?.map((item) => (
            <TabCard
              key={item.definitionId}
              item={item}
              completeList={data!}
              selection={selection}
              setSelectionElements={setSelectionElements}
              tabcard={false}
            />
          ))}
        </div>
      </ScrollBar>
    </>
  );
};

export default IconView;
