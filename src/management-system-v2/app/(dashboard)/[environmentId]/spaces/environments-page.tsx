'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { Button } from 'antd';
import { FC } from 'react';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import Link from 'next/link';

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

  return (
    <>
      <Bar
        leftNode={
          <Link href="/create-organization">
            <Button type="primary">New Organization</Button>
          </Link>
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
            render: (id: string) => (
              <Link href={`/${id}/processes`}>
                <Button>Enter</Button>
              </Link>
            ),
          },
        ]}
        data={filteredData}
        tableProps={{
          rowKey: 'id',
        }}
      />
    </>
  );
};
export default EnvironmentsPage;
