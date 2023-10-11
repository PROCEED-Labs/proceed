'use client';

import { List } from 'antd';
import React, { Dispatch, FC, Key, SetStateAction, useState } from 'react';

import TabCard from './tabcard-model-metadata';

import { Preferences, getPreferences } from '@/lib/utils';
import { ApiData } from '@/lib/fetch-data';

type Processes = ApiData<'/process', 'get'>;

type IconViewProps = {
  data?: Processes;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
};

const IconView: FC<IconViewProps> = ({ data, selection, setSelection }) => {
  const [rerender, setRerender] = useState(false);

  const triggerRerender = () => {
    setRerender(!rerender);
  };

  const prefs: Preferences = getPreferences();
  const layout = prefs['show-process-meta-data']
    ? /* Side-Panel opened: */
      {
        xs: 1,
        sm: 1,
        md: 1,
        lg: 1,
        xl: 2,
        xxl: 3,
      }
    : /*  Side-Panel closed: */
      {
        xs: 1,
        sm: 2,
        md: 4,
        lg: 4,
        xl: 4,
        xxl: 4,
      };

  return (
    <div
      style={{
        display: 'inline-flex',
        justifyContent: 'space-between',
      }}
    >
      <List
        /* Force rerender when layout changes */
        key={layout.xxl}
        className="Hide-Scroll-Bar"
        style={{
          flex: 3,
        }}
        grid={{
          gutter: 16,
          /* column: 4 */
          ...layout,
        }}
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            {
              <TabCard
                item={item}
                completeList={data!}
                selection={selection}
                setSelection={setSelection}
                tabcard={false}
              />
            }
          </List.Item>
        )}
      />
      {/* <MetaData data={data} selection={selection} triggerRerender={triggerRerender} /> */}
    </div>
  );
};

export default IconView;
