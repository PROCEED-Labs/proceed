'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { Button, Space } from 'antd';
import { FC, useState } from 'react';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import EnvironmentSidePanel from './environments-side-panel';
import { AiOutlineClose } from 'react-icons/ai';
import SelectionActions from '@/components/selection-actions';
import ElementList from '@/components/item-list-view';

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
          leftNode={
            <Space>
              <Button type="primary" href="/create-organization">
                New Organization
              </Button>
              <SelectionActions count={selectedRowKeys.length}>
                <Button type="text" icon={<AiOutlineClose />} onClick={() => setSelectedRows([])} />
              </SelectionActions>
            </Space>
          }
          searchProps={{
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: 'Search Environments',
          }}
        />
        <ElementList<(typeof filteredData)[number]>
          columns={[
            { title: 'Name', render: (_, environment) => environment.name.highlighted },
            {
              title: 'Description',
              render: (_, environment) => environment.description.highlighted,
            },
            {
              dataIndex: 'id',
              key: 'tooltip',
              title: '',
              width: 100,
              render: (id: string, environment) => <></>,
            },
          ]}
          data={filteredData}
          elementSelection={{
            selectedElements: selectedRows,
            setSelectionElements: (orgs) => setSelectedRows(orgs),
          }}
          tableProps={{
            rowKey: 'id',
            onRow: (row) => ({
              onClick: () => setSelectedRows([row]),
            }),
          }}
        />
      </div>

      <EnvironmentSidePanel environment={selectedRow} />
    </div>
  );
};
export default EnvironmentsPage;
