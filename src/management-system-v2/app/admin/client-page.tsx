import { Table } from 'antd';
import React from 'react';

type AdminPageProps = {
  spaces: Record<'name' | 'type' | 'owner', React.ReactNode>[];
};
export function AdminPage({ spaces }: AdminPageProps) {
  return (
    <Table
      dataSource={spaces}
      columns={[
        {
          title: 'Name',
          dataIndex: 'name',
        },
        {
          title: 'Type',
          dataIndex: 'type',
        },
        {
          title: 'Owner',
          dataIndex: 'owner',
        },
      ]}
    />
  );
}
