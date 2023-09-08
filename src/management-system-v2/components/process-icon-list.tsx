'use client';

import { Process } from '@/lib/fetch-data';
import { Card, List } from 'antd';
import { useRouter } from 'next/navigation';
import React, { FC } from 'react';
import Viewer from './bpmn-viewer';

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
};

const IconView: FC<IconViewProps> = ({ data }) => {
  const router = useRouter();

  console.log(data);
  return (
    <List
      grid={{ gutter: 20, column: 4 }}
      dataSource={data}
      renderItem={(item) => (
        <List.Item>
          <Card
            title={item.definitionName}
            onClick={() => {
              router.push(`/processes/${item.definitionId}`);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ height: '200px', width: '100%' }}>
              <Viewer selectedElement={item} reduceLogo={true} />
            </div>
          </Card>
        </List.Item>
      )}
    />
  );
};

export default IconView;
