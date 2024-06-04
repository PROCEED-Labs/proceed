'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { App, Button, Space, Table, Typography } from 'antd';
import { FC, useState, useTransition } from 'react';
import CreateEnvironmentButton from './create-environment-button';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import EnvironmentSidePanel from './environments-side-panel';
import ConfirmationButton from '@/components/confirmation-button';
import { useSession } from 'next-auth/react';
import { deleteOrganizationEnvironments } from '@/lib/data/environments';
import { useRouter } from 'next/navigation';
import { AiOutlineClose, AiOutlineDelete } from 'react-icons/ai';

const highlightedKeys = ['name', 'description'] as const;
export type FilteredEnvironment = ReplaceKeysWithHighlighted<
  OrganizationEnvironment,
  (typeof highlightedKeys)[number]
>;

const EnvironmentsPage: FC<{ organizationEnvironments: OrganizationEnvironment[] }> = ({
  organizationEnvironments,
}) => {
  const { message } = App.useApp();
  const router = useRouter();

  const { searchQuery, filteredData, setSearchQuery } = useFuzySearch({
    data: organizationEnvironments,
    keys: ['name', 'description'],
    highlightedKeys,
    transformData: (results) => results.map((result) => result.item),
  });

  const [selectedRows, setSelectedRows] = useState<typeof filteredData>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const selectedRowKeys = selectedRows.map((row) => row.id);
  const selectedRow = selectedRows.at(-1);

  const session = useSession();
  const userId = session.data?.user?.id || '';

  const [isDeletingEnvironments, startTransition] = useTransition();
  function deleteEnvironments(environmentIds: string[]) {
    startTransition(async () => {
      try {
        const result = await deleteOrganizationEnvironments(environmentIds);
        if (result && 'error' in result) throw result.error;

        setSelectedRows([]);
        router.refresh();
        message.open({
          content: `Environment${environmentIds.length > 1 ? 's' : ''} deleted`,
          type: 'success',
        });
      } catch (e) {
        console.log(e);
        //@ts-ignore
        const content = (e && e?.message) || 'Something went wrong';
        message.open({ content, type: 'error' });
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', gap: '10px' }}>
      <div style={{ flexGrow: 1 }}>
        <Bar
          leftNode={
            selectedRowKeys.length > 0 ? (
              <Space size={20}>
                <Button type="text" icon={<AiOutlineClose />} onClick={() => setSelectedRows([])} />
                <span>{selectedRowKeys.length} selected:</span>
                <ConfirmationButton
                  title="Delete Organizations"
                  description={
                    <Space direction="vertical">
                      <Typography.Text>
                        Are you sure you want to delete the selected organizations?
                      </Typography.Text>
                      <Typography.Text type="danger">
                        All processes inside these organizations will be lost.
                      </Typography.Text>
                    </Space>
                  }
                  onConfirm={() => deleteEnvironments(selectedRowKeys)}
                  buttonProps={{
                    icon: <AiOutlineDelete />,
                    disabled: false, // TODO check ability
                    type: 'text',
                  }}
                />
              </Space>
            ) : null
          }
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
            {
              dataIndex: 'id',
              key: 'tooltip',
              title: '',
              width: 100,
              render: (id: string, environment) => (
                <ConfirmationButton
                  title="Delete Organization"
                  description={
                    <Space direction="vertical">
                      <Typography.Text>
                        Are you sure you want to delete this organization?
                      </Typography.Text>
                      <Typography.Text type="danger">
                        All processes inside this organization will be lost.
                      </Typography.Text>
                    </Space>
                  }
                  onConfirm={() => deleteEnvironments([id])}
                  canCloseWhileLoading={true}
                  buttonProps={{
                    disabled: environment.id === userId,
                    style: {
                      opacity: id === hoveredRow ? 1 : 0,
                      // Otherwise the button stretches the row
                      position: 'absolute',
                      margin: 'auto',
                      top: '0',
                      bottom: '0',
                    },
                    icon: <AiOutlineDelete />,
                    type: 'text',
                  }}
                />
              ),
            },
          ]}
          dataSource={filteredData}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (_, rows) => setSelectedRows(rows),
          }}
          onRow={(row) => ({
            onMouseEnter: () => setHoveredRow(row.id),
            onMouseLeave: () => setHoveredRow(null),
            onClick: () => setSelectedRows([row]),
          })}
        />
      </div>

      <EnvironmentSidePanel environment={selectedRow} />
    </div>
  );
};
export default EnvironmentsPage;
