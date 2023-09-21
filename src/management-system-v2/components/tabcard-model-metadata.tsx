import { Button, Card, Descriptions, DescriptionsProps } from 'antd';
import React, { Dispatch, FC, Key, SetStateAction, useState } from 'react';

import { MoreOutlined } from '@ant-design/icons';
import { Process } from '@/lib/fetch-data';
import Viewer from './bpmn-viewer';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';

import { generateDateString } from '@/lib/utils';

type TabCardProps = {
  item:
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

const tabList = [
  {
    key: 'viewer',
    tab: <span style={{ fontSize: 12 }}>Model</span>,
  },
  {
    key: 'meta',
    tab: <span style={{ fontSize: 12 }}>Meta Data</span>,
  },
];

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
      children: description.length > 20 ? `${description.slice(0, 21)} ...` : `${description}`,
    },
  ];
  return desc;
};

const TabCard: FC<TabCardProps> = ({ item, selection, setSelection }) => {
  const router = useRouter();
  const [activeTabKey, setActiveTabKey] = useState<string>('viewer');

  const generateContentList = (data: Process) => {
    const contentList: Record<string, React.ReactNode> = {
      viewer: (
        <div
          style={{
            height: '200px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
          }}
          onDoubleClick={() => {
            router.push(`/processes/${data.definitionId}`);
          }}
        >
          <Viewer selectedElement={data} reduceLogo={true} />
        </div>
      ),
      meta: (
        <Descriptions
          // title="User Info"
          bordered
          size="small"
          column={1}
          items={
            generateDescription(data)
            // testdesc
          }
        />
      ),
    };

    return contentList;
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  return (
    <Card
      hoverable
      title={
        <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
          <span>{item?.definitionName}</span>
          <span style={{ flex: 1 }}></span>
          <Button type="text">
            <MoreOutlined />
          </Button>
        </div>
      }
      style={{
        cursor: 'pointer',
        minHeight: '340px',
        maxWidth: 'calc(100vw / 5)',
        /* backgroundColor: '#ebf8ff',
        border: '1px solid #1976D2', */
      }}
      className={classNames({
        'small-tabs': true,
        'card-selected': selection.includes(item?.definitionId),
      })}
      tabList={tabList}
      activeTabKey={activeTabKey}
      onTabChange={onTabChange}
      onClick={(event) => {
        if (event.ctrlKey) {
          if (!selection.includes(item?.definitionId)) {
            setSelection([item?.definitionId, ...selection]);
          } else {
            setSelection(selection.filter((id) => id !== item?.definitionId));
          }
        } else {
          setSelection([item?.definitionId]);
        }
      }}
    >
      {generateContentList(item)[activeTabKey]}
    </Card>
  );
};

export default TabCard;
