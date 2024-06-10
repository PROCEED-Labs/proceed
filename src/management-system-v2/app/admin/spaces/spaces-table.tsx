'use client';

import { App } from 'antd';
import React, { ReactNode } from 'react';
import { type deleteSpace } from './page';
import ConfirmationButton from '@/components/confirmation-button';
import { DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ElementList from '@/components/item-list-view';
import styles from '@/components/item-list-view.module.scss';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import dynamic from 'next/dynamic';
import Link from 'next/link';

type AdminPageProps = {
  spaces: Record<'name' | 'type' | 'owner' | 'id', string>[];
  deleteSpace: deleteSpace;
};

function SpacesTable({ spaces, deleteSpace: serverDeleteSpace }: AdminPageProps) {
  const router = useRouter();
  const { message } = App.useApp();

  async function deleteSpace(id: string) {
    try {
      const response = await serverDeleteSpace(id);
      if (response && 'error' in response) throw response.error.message;

      router.refresh();
      message.open({ type: 'success', content: 'Environment removed' });
    } catch (error) {
      let messageContent: ReactNode = 'Something went wrong';
      if (React.isValidElement(error)) messageContent = error;

      message.open({ type: 'error', content: messageContent });
    }
  }
  const { filteredData, searchQuery, setSearchQuery } = useFuzySearch({
    data: spaces,
    keys: ['name', 'type'],
    highlightedKeys: ['name', 'type'],
    queryName: 'search',
    transformData: (matches) => matches.map((match) => match.item),
  });

  return (
    <>
      <Bar
        searchProps={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          onPressEnter: (e) => setSearchQuery(e.currentTarget.value),
          placeholder: 'Search spaces ...',
        }}
      />

      <ElementList
        data={filteredData}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            render: (_, space) => (
              <Link href={`/${space.id}/processes/`} style={{ color: 'black' }}>
                {space.name.highlighted}
              </Link>
            ),
          },
          {
            title: 'Type',
            dataIndex: 'type',
            render: (_, space) => space.type.highlighted,
          },
          {
            title: 'Owner',
            dataIndex: 'owner',
          },
          {
            dataIndex: 'id',
            fixed: 'right',
            render: (id: string) => (
              <ConfirmationButton
                title="Remove Environment"
                description="Are you sure you want to remove this environment?"
                onConfirm={() => deleteSpace(id)}
                buttonProps={{
                  className: styles.HoverableTableCell,
                  children: 'Remove Environment',
                  icon: <DeleteOutlined />,
                  type: 'text',
                }}
              />
            ),
          },
        ]}
      />
    </>
  );
}

// This is necessary, since the search query is stored in the useImperativeHandle(
// so the highlighting of the fuzzy search will look different once the table is
// rendered on the client, which whil cause a hydration error.
export default dynamic(() => Promise.resolve(SpacesTable), {
  ssr: false,
});
