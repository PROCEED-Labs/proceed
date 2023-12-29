'use client';

import React, { Dispatch, FC, Key, SetStateAction } from 'react';
import styles from './process-icon-list.module.scss'
import cn from 'classnames';

import TabCard from './tabcard-model-metadata';

import ScrollBar from './scrollbar';
import { ProcessListProcess } from './processes';
import { Grid } from 'antd';

type IconViewProps = {
  data?: ProcessListProcess[];
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
};

const IconView: FC<IconViewProps> = ({ data, selection, setSelection, setShowMobileMetaData }) => {
  const breakpoint = Grid.useBreakpoint()
  return (
    <>
      <ScrollBar width="12px">
        <div
        className={cn(breakpoint.xs ? styles.MobileIconView : styles.IconView )}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            justifyContent: 'space-between',
            gridGap: '20px',
          }}
        >
          {data?.map((item) => (
            <TabCard
              setShowMobileMetaData={setShowMobileMetaData}
              key={item.definitionId}
              item={item}
              completeList={data!}
              selection={selection}
              setSelection={setSelection}
              tabcard={false}
            />
          ))}
        </div>
      </ScrollBar>
    </>
  );
};

export default IconView;
