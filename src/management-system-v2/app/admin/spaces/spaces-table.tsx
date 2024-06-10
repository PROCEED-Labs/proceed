'use client';

import { App, Table } from 'antd';
import React, { ReactNode } from 'react';
import { type deleteSpace } from './page';
import ConfirmationButton from '@/components/confirmation-button';
import { DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ElementList from '@/components/item-list-view';
import styles from '@/components/item-list-view.module.scss';

type AdminPageProps = {
  spaces: (Record<'name' | 'type' | 'owner', React.ReactNode> & { id: string })[];
  deleteSpace: deleteSpace;
};
export function SpacesTable({ spaces, deleteSpace: serverDeleteSpace }: AdminPageProps) {
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

  return (
    <ElementList
      data={spaces}
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
  );
}
