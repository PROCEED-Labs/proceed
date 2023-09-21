'use client';

import { Process } from '@/lib/fetch-data';
import { Card, List, Descriptions, Button, Divider } from 'antd';
import { useRouter } from 'next/navigation';
import React, { Dispatch, FC, Key, SetStateAction, useState } from 'react';
import Viewer from './bpmn-viewer';
import { MoreOutlined } from '@ant-design/icons';

import type { DescriptionsProps } from 'antd';
import TabCard from './tabcard-model-metadata';

import style from './process-icon-list.module.scss';
import classNames from 'classnames';

import { generateDateString } from '@/lib/utils';

const BPMNViewer =
  typeof window !== 'undefined' ? import('bpmn-js/lib/Viewer').then((mod) => mod.default) : null;

type IconViewProps = {
  data:
    | {
        description: string;
        processIds: string[];
        variables: [];
        departments: [];
        inEditingBy: [];
        createdOn: Date;
        lastEdited: Date;
        shared: boolean;
        versions: ({ version: number | string; name: string; description: string } | null)[];
        definitionId: string;
        definitionName: string;
        bpmn?: string;
      }[]
    | undefined;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
};

const generateDescription = (data: Process) => {
  const { description, createdOn, lastEdited, definitionName, definitionId, owner } = data;
  const desc: DescriptionsProps['items'] = [
    {
      key: `1`,
      label: 'Last Edited',
      children: generateDateString(lastEdited),
    },
    {
      key: `2`,
      label: 'Created On',
      children: generateDateString(createdOn),
    },
    {
      key: `3`,
      label: 'File Size',
      children: `${'1.2 MB'}`,
    },
    {
      key: `4`,
      label: 'Owner',
      children: `${owner}`,
    },
    {
      key: `5`,
      label: 'Description',
      children: `${description}`,
    },
  ];
  return desc;
};

const IconView: FC<IconViewProps> = ({ data, selection, setSelection }) => {
  const router = useRouter();

  /* The different tabs: */
  // const contentList: Record<string, React.ReactNode> = {
  //   viewer: (
  //     <div style={{ height: '200px', width: '100%' }}>
  //       <Viewer selectedElement={item} reduceLogo={true} />
  //     </div>
  //   ),
  //   meta: (
  //     <Descriptions
  //       // title="User Info"
  //       bordered
  //       size="small"
  //       column={1}
  //       items={generateDescription(item)}
  //     />
  //   ),
  // };

  return (
    <div
      style={{
        display: 'inline-flex',
        justifyContent: 'space-between',
        height: 'calc(100% - 80px)',
      }}
    >
      <List
        className="Hide-Scroll-Bar"
        style={{
          flex: 3,
          scrollBehavior: 'smooth',
          overflowY: 'scroll',
          height: '100%',
          scrollbarWidth: 'none',
        }}
        grid={{ gutter: 16, /* column: 4 */ xs: 1, sm: 1, md: 1, lg: 1, xl: 2, xxl: 3 }}
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            {<TabCard item={item} selection={selection} setSelection={setSelection} />}
            {/* Alternative: */}
            {/* <Card
            hoverable
            title={
              <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                <span>{item.definitionName}</span>
                <span style={{ flex: 1 }}></span>
                <Button type="text">
                  <MoreOutlined />
                </Button>
              </div>
            }
            // onClick={() => {
            //   router.push(`/processes/${item.definitionId}`);
            // }}
            style={{
              cursor: 'pointer',
            }}
          >
            <Descriptions
              // title="User Info"
              bordered
              size="small"
              column={1}
              items={
                generateDescription(item)
                // testdesc
              }
              style={{
                position: 'relative',
                zIndex: 2,
              }}
            />
            <Card
              style={{
                borderTopRightRadius: '0px',
                borderTopLeftRadius: '0px',
                borderTop: 'none',
                marginTop: '-5px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  height: '200px',
                  width: '100%',
                }}
              >
                <Viewer selectedElement={item} reduceLogo={true} />
              </div>
            </Card>
          </Card> */}
          </List.Item>
        )}
      />
      <Card
        style={{
          flex: 1,
          marginLeft: '20px',
          scrollBehavior: 'smooth',
          overflowY: 'scroll',
          height: '100%',
          scrollbarWidth: 'none',
        }}
        title={
          selection.length
            ? data?.find((item) => item.definitionId === selection[0])?.definitionName
            : 'No process selected'
        }
      >
        {/* Viewer */}
        <div
          style={{
            height: '200px',
            width: '100%',
          }}
        >
          {Boolean(selection.length) && (
            <>
              <Viewer
                selectedElement={data?.find((item) => item.definitionId === selection[0])}
                reduceLogo={true}
              />

              <Divider style={{ width: '140%', marginLeft: '-20%' }} />
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
              <p>{data?.find((item) => item.definitionId === selection[0])?.description}</p>

              <Divider style={{ width: '140%', marginLeft: '-20%' }} />
              <h3>Access Rights</h3>
              <p>Test</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default IconView;
