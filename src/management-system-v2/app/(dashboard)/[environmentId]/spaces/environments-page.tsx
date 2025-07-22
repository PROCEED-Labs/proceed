'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { Button } from 'antd';
import { FC, use } from 'react';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import Link from 'next/link';
import { EnvVarsContext } from '@/components/env-vars-context';

const highlightedKeys = ['name', 'description'] as const;
export type FilteredEnvironment = ReplaceKeysWithHighlighted<
  OrganizationEnvironment,
  (typeof highlightedKeys)[number]
>;

const EnvironmentsPage: FC<{ organizationEnvironments: OrganizationEnvironment[] }> = ({
  organizationEnvironments,
}) => {
  const env = use(EnvVarsContext);
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
          !env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE ? (
            <Link href="/create-organization">
              <Button type="primary">New Organization</Button>
            </Link>
          ) : null
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
