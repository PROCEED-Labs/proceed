'use client';

import React, { Dispatch, FC, Key, SetStateAction } from 'react';

import TabCard from './tabcard-model-metadata';

import { ApiData } from '@/lib/fetch-data';
import ScrollBar from './scrollbar';

type Processes = ApiData<'/process', 'get'>;

type IconViewProps = {
  data?: Processes;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  search?: string;
};

const IconView: FC<IconViewProps> = ({ data, selection, setSelection, search }) => {
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
          {data?.map((item, i, arr) => (
            <TabCard
              key={item.definitionId}
              item={item}
              completeList={data!}
              selection={selection}
              setSelection={setSelection}
              tabcard={false}
              search={search}
            />
          ))}
        </div>
      </ScrollBar>
    </>
  );
};

export default IconView;
