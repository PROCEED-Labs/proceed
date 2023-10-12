'use client';

import { List } from 'antd';
import React, { Dispatch, FC, Key, SetStateAction, useEffect, useState } from 'react';

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
  let layout = prefs['show-process-meta-data']
    ? /* Side-Panel opened: */
      {
        gutter: 16,
        xs: 1,
        sm: 1,
        md: 1,
        lg: 1,
        xl: 2,
        xxl: 3,
      }
    : /*  Side-Panel closed: */
      {
        gutter: 16,
        xs: 1,
        sm: 2,
        md: 4,
        lg: 4,
        xl: 4,
        xxl: 4,
      };

  return (
    <>
      <div
        className="Hide-Scroll-Bar"
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          justifyContent: 'space-between',
          gridGap: '20px',
          // display: 'flex',
          // justifyContent: 'space-between',
          // alignContent: 'space-between',
          // flexWrap: 'wrap',
          overflowX: 'hidden',
          msOverflowY: 'scroll',
          /* TODO: Make parent fitting height */
          // height: '100%',
          height: 'calc(100vh - 220px)',
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
            justify={i > arr.length - 1 - 3}
          />
        ))}
      </div>
      {/* <MetaData data={data} selection={selection} triggerRerender={triggerRerender} /> */}
    </>
  );
};

export default IconView;

// <List
//         /* Force rerender when layout changes */
//         key={layout.xxl}
//         className="Hide-Scroll-Bar"
//         style={{
//           flex: 3,
//         }}
//         grid={
//           /* column: 4 */
//           layout
//         }
//         dataSource={data}
//         renderItem={(item) => (
//           <List.Item>
//             {
//               <TabCard
//                 item={item}
//                 completeList={data!}
//                 selection={selection}
//                 setSelection={setSelection}
//                 tabcard={false}
//               />
//             }
//           </List.Item>
//         )}
//       />
