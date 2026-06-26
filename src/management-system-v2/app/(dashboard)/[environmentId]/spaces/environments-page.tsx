'use client';

import Bar from '@/components/bar';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import { App, Button, Form, Modal, Skeleton, Space, Tooltip } from 'antd';
import { FC, use, useState } from 'react';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import Link from 'next/link';
import ConfirmationButton from '@/components/confirmation-button';
import { leaveOrganization } from '@/lib/data/environments';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import { SettingOutlined, CopyOutlined, CloseOutlined } from '@ant-design/icons';
import { createPairingCode, getPairingCode, revokePairingCode } from '@/lib/data/mcp-authorization';
import { isUserErrorResponse } from '@/lib/user-error';
import { EnvVarsContext } from '@/components/env-vars-context';
import styles from './environments-page.module.scss';
import { useQuery } from '@tanstack/react-query';

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

  const [spaceToConnect, setSpaceToConnect] = useState('');
  const [creatingPairingCode, setCreatingPairingCode] = useState(false);
  const [revokingPairingCode, setRevokingPairingCode] = useState(false);

  const env = use(EnvVarsContext);

  const handleCreateAccessCode = async (environmentId: string) => {
    setCreatingPairingCode(true);
    const code = await createPairingCode(environmentId);

    if (isUserErrorResponse(code)) {
      app.message.error(code.error.message);
    } else {
      navigator.clipboard.writeText(code);
      app.message.success('Copied the code to your clipboard');
      refetchPairingCode();
    }

    setCreatingPairingCode(false);
  };

  const {
    data: mcpPairingCode,
    isLoading: pairingCodeLoading,
    refetch: refetchPairingCode,
  } = useQuery({
    queryFn: async () => {
      if (env.PROCEED_PUBLIC_MCP_ACTIVE && spaceToConnect) {
        const code = await getPairingCode(spaceToConnect);

        if (!isUserErrorResponse(code)) {
          return code;
        }
      }

      return '';
    },
    queryKey: ['mcp-access-code', env.PROCEED_PUBLIC_MCP_ACTIVE, spaceToConnect],
  });

  let baseUrl = new URL(window.location.href);
  baseUrl.pathname = 'mcp';

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
                <Link href={`/${id}/start`}>
                  <Button>Enter</Button>
                </Link>
                {env.PROCEED_PUBLIC_MCP_ACTIVE && (
                  <Button onClick={() => setSpaceToConnect(environment.id)}>Connect Chatbot</Button>
                )}
                {environment.isOrganization && (
                  <ConfirmationButton
                    title={`Leave ${environment.name.value}`}
                    description="You are about to leave this Space. This cannot be undone, except if someone within this Space adds you again."
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

      {env.PROCEED_PUBLIC_MCP_ACTIVE && (
        <Modal
          open={!!spaceToConnect}
          title="Connect Chatbot"
          onCancel={() => setSpaceToConnect('')}
          onOk={() => setSpaceToConnect('')}
        >
          <div style={{ marginTop: '16px' }}>
            <Form.Item
              style={{ marginBottom: '16px' }}
              label="Connection Address"
              layout="vertical"
            >
              <div style={{ display: 'flex' }}>
                <div className={styles.ChatbotConnectionInfo}>{baseUrl.toString()}</div>
                <Tooltip title="Copy to your Clipboard">
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(baseUrl.toString());
                      app.message.success('Copied the address to your clipboard');
                    }}
                  />
                </Tooltip>
              </div>
            </Form.Item>
            <Form.Item label="Connection Code" layout="vertical">
              <div style={{ display: 'flex' }}>
                {pairingCodeLoading ? (
                  <Skeleton active paragraph={{ rows: 1 }} />
                ) : (
                  <>
                    {mcpPairingCode ? (
                      <>
                        <div className={styles.ChatbotConnectionInfo}>{mcpPairingCode}</div>
                        <Tooltip title="Copy to your Clipboard">
                          <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(mcpPairingCode!);
                              app.message.success('Copied the code to your clipboard');
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Revoke the Code">
                          <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={async () => {
                              setRevokingPairingCode(true);
                              await revokePairingCode(spaceToConnect);
                              refetchPairingCode();
                              setRevokingPairingCode(false);
                              app.message.success('Revoked the access code for this space.');
                            }}
                            loading={revokingPairingCode}
                          />
                        </Tooltip>
                      </>
                    ) : (
                      <Button
                        type="primary"
                        block
                        onClick={() => handleCreateAccessCode(spaceToConnect)}
                        loading={creatingPairingCode}
                      >
                        Create new Code
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Form.Item>
          </div>
        </Modal>
      )}
    </>
  );
};
export default EnvironmentsPage;
