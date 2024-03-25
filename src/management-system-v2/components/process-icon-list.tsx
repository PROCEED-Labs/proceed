'use client';

import { Dispatch, FC, Key, SetStateAction } from 'react';
import styles from './process-icon-list.module.scss';
import cn from 'classnames';

import TabCard from './tabcard-model-metadata';

import ScrollBar from './scrollbar';
import { ProcessListProcess } from './processes';
import { Grid } from 'antd';

type IconViewProps = {
  data: ProcessListProcess[];
  selection: Key[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
};

const IconView: FC<IconViewProps> = ({
  data,
  selection,
  setSelectionElements,
  setShowMobileMetaData,
}) => {
  const breakpoint = Grid.useBreakpoint();
  const folders = data.filter((item) => item.type === 'folder') as Extract<
    ProcessListProcess,
    { type: 'folder' }
  >[];
  const processes = data.filter((item) => item.type !== 'folder') as Exclude<
    ProcessListProcess,
    { type: 'folder' }
  >[];

  return (
    <>
      <ScrollBar width="12px">
        {folders.length > 0 && (
          <div
            className={cn(breakpoint.xs ? styles.MobileIconView : styles.IconView)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              justifyContent: 'space-between',
              gridGap: '20px',
              marginBottom: '20px',
            }}
          >
            {folders.map((item) => (
              <TabCard
                setShowMobileMetaData={setShowMobileMetaData}
                item={item}
                completeList={data!}
                selection={selection}
                setSelectionElements={setSelectionElements}
                tabcard={false}
              />
            ))}
          </div>
        )}

        <div
          className={cn(breakpoint.xs ? styles.MobileIconView : styles.IconView)}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            justifyContent: 'space-between',
            gridGap: '20px',
          }}
        >
          {processes.map((item) => (
            <TabCard
              setShowMobileMetaData={setShowMobileMetaData}
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
