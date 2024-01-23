'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { Table } from 'antd';
import { FC, useState } from 'react';
import CreateEnvironmentButton from './create-environment-button';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import EnvironmentSidePanel from './environments-side-panel';

const highlightedKeys = ['name', 'description'] as const;
export type FilteredEnvironment = ReplaceKeysWithHighlighted<
  OrganizationEnvironment,
  (typeof highlightedKeys)[number]
>;

const EnvironmentsPage: FC<{ organizationEnvironments: OrganizationEnvironment[] }> = ({
  organizationEnvironments,
}) => {
  const { searchQuery, filteredData, setSearchQuery } = useFuzySearch({
    data: organizationEnvironments,
    keys: ['name', 'description'],
    highlightedKeys,
    transformData: (results) => results.map((result) => result.item),
  });

  const [selectedRows, setSelectedRows] = useState<typeof filteredData>([]);
  const selectedRowKeys = selectedRows.map((row) => row.id);
  const selectedRow = selectedRows.at(-1);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', gap: '10px' }}>
      <div style={{ flexGrow: 1 }}>
        <Bar
          searchProps={{
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: 'Search Environments',
          }}
          rightNode={<CreateEnvironmentButton />}
        />
        <Table<(typeof filteredData)[number]>
          columns={[
            { title: 'Name', render: (_, environment) => environment.name.highlighted },
            {
              title: 'Description',
              render: (_, environment) => environment.description.highlighted,
            },
          ]}
          dataSource={filteredData}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (_, rows) => setSelectedRows(rows),
          }}
          onRow={(row) => ({
            onClick: () => setSelectedRows([row]),
          })}
        />
      </div>

      <EnvironmentSidePanel environment={selectedRow} />
    </div>
  );
};
export default EnvironmentsPage;
