'use client';

import { App } from 'antd';
import React, { ReactNode, useState } from 'react';
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
import SelectionActions from '@/components/selection-actions';

type AdminPageProps = {
  spaces: Record<'name' | 'type' | 'owner' | 'id', string>[];
  deleteSpace: deleteSpace;
};

function SpacesTable({ spaces, deleteSpace: serverDeleteSpace }: AdminPageProps) {
  const router = useRouter();
  const { message } = App.useApp();

  const { filteredData, searchQuery, setSearchQuery } = useFuzySearch({
    data: spaces,
    keys: ['name', 'type', 'owner'],
    highlightedKeys: ['name', 'type', 'owner'],
    queryName: 'search',
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [selectedSpaces, setSelectedSpaces] = useState<typeof filteredData>([]);

  async function deleteSpace(ids: string[]) {
    try {
      const response = await serverDeleteSpace(ids);
      if (response && 'error' in response) throw response.error.message;

      setSelectedSpaces([]);
      router.refresh();
      message.open({ type: 'success', content: `Space${ids.length > 1 ? 's' : ''} removed` });
    } catch (error) {
      let messageContent: ReactNode = 'Something went wrong';
      if (React.isValidElement(error)) messageContent = error;

      message.open({ type: 'error', content: messageContent });
    }
  }

  return (
    <>
      <Bar
        leftNode={
          <SelectionActions count={selectedSpaces.length}>
            <ConfirmationButton
              title="Remove selected spaces"
              description="Are you sure you want to remove these spaces?"
              onConfirm={() => deleteSpace(selectedSpaces.map((space) => space.id))}
              buttonProps={{
                children: 'Remove Selected',
                icon: <DeleteOutlined />,
                type: 'text',
              }}
            />
          </SelectionActions>
        }
        searchProps={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          onPressEnter: (e) => setSearchQuery(e.currentTarget.value),
          placeholder: 'Search spaces ...',
        }}
      />

      <ElementList
        data={filteredData}
        elementSelection={{
          selectedElements: selectedSpaces,
          setSelectionElements: setSelectedSpaces,
        }}
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
            render: (_, space) => space.owner.highlighted,
          },
          {
            dataIndex: 'id',
            fixed: 'right',
            render: (id: string) => (
              <ConfirmationButton
                title="Remove Environment"
                description="Are you sure you want to remove this environment?"
                onConfirm={() => deleteSpace([id])}
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
