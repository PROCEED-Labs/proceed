'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { App, Button, Space } from 'antd';
import { FC } from 'react';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import Link from 'next/link';
import ConfirmationButton from '@/components/confirmation-button';
import { leaveOrganization } from '@/lib/data/environments';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import { SettingOutlined } from '@ant-design/icons';
import { getPairingCode } from '@/lib/data/mcp-authorization';
import { isUserErrorResponse } from '@/lib/user-error';

const highlightedKeys = ['name', 'description'] as const;
export type FilteredEnvironment = ReplaceKeysWithHighlighted<
  OrganizationEnvironment,
  (typeof highlightedKeys)[number]
>;

const EnvironmentsPage: FC<{
  spaces: {
    id: string;
    name: string;
    description: string;
    isOrganization: boolean;
  }[];
}> = ({ spaces: organizationEnvironments }) => {
  const app = App.useApp();
  const router = useRouter();
  const { searchQuery, filteredData, setSearchQuery } = useFuzySearch({
    data: organizationEnvironments,
    keys: ['name', 'description'],
    highlightedKeys,
    transformData: (results) => results.map((result) => result.item),
  });

  const handleCreateAccessCode = async (environmentId: string) => {
    const code = await getPairingCode(environmentId);

    if (isUserErrorResponse(code)) {
      app.message.error(code.error.message);
      return;
    }

    navigator.clipboard.writeText(code);
  };

  return (
    <>
      <Bar
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
            render: (id, environment) => (
              <Space>
                <Link href={`/${id}/processes`}>
                  <Button>Enter</Button>
                </Link>
                {
                  <Button onClick={() => handleCreateAccessCode(environment.id)}>
                    Connect Chatbot
                  </Button>
                }
                {environment.isOrganization && (
                  <ConfirmationButton
                    title={`Leave ${environment.name.value}`}
                    description="You are about to leave this Organization. This cannot be undone, except if someone within this Organization adds you again."
                    onConfirm={async () => {
                      await wrapServerCall({
                        fn: () => leaveOrganization(id),
                        onSuccess: () => {
                          app.message.success('Success');
                          router.refresh();
                        },
                        errorDisplay: 'notification',
                        app,
                      });
                    }}
                  >
                    Leave
                  </ConfirmationButton>
                )}
                {!environment.isOrganization && (
                  <Link href="/settings" passHref legacyBehavior>
                    <Button>
                      <SettingOutlined />
                    </Button>
                  </Link>
                )}
              </Space>
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
