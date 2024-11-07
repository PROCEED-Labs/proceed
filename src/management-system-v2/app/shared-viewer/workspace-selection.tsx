import React, { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { Avatar, message, Space, Button, Typography, Modal, Spin } from 'antd';
import { LaptopOutlined } from '@ant-design/icons';

import { getAllUserWorkspaces } from '@/lib/sharing/process-sharing';
import { copyProcesses } from '@/lib/data/processes';

import { Environment } from '@/lib/data/environment-schema';
import { getProcess } from '@/lib/data/legacy/process';
import { VersionInfo } from './process-document';

import styles from './workspace-selection.module.scss';

type WorkspaceSelectionProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  versionInfo: VersionInfo;
};

async function getWorkspacesQueryFunction(userId: string) {
  // Without this, we would call a server action as the first thing after
  // suspending. Apparently, this leads to an error that you can't call
  // setState while rendering. This little delay is already enough to
  // prevent that.
  await Promise.resolve();

  return await getAllUserWorkspaces(userId);
}

const WorkspaceSelection: React.FC<WorkspaceSelectionProps> = ({ processData, versionInfo }) => {
  const session = useSession();
  const router = useRouter();

  const { data: workspaces } = useSuspenseQuery({
    queryKey: ['workspaces', session.data?.user.id],
    queryFn: async () => getWorkspacesQueryFunction(session.data?.user.id as string),
  });

  const copyToWorkspace = async (workspace: Environment) => {
    const processesToCopy = [
      {
        name: processData.name,
        description: processData.description,
        originalId: processData.id,
        originalVersion: typeof versionInfo.id === 'number' ? `${versionInfo.id}` : undefined,
      },
    ];

    const copiedProcesses = await copyProcesses(processesToCopy, workspace.id);

    if ('error' in copiedProcesses) {
      message.error(copiedProcesses.error.message);
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      if (copiedProcesses.length === 1) {
        router.push(
          `${workspace.isOrganization ? workspace.id : ''}/processes/${copiedProcesses[0].id}`,
        );
      }
    }
  };

  const userWorkspaces = workspaces.map((workspace, index) => ({
    label: workspace.isOrganization ? workspace.name : 'My Space',
    key: `${workspace.id}-${index}`,
    logo:
      workspace.isOrganization && workspace.logoUrl ? (
        <Avatar size={'large'} src={workspace.logoUrl} />
      ) : (
        <Avatar size={50} icon={<LaptopOutlined style={{ color: 'black' }} />} />
      ),
    optionOnClick: () => copyToWorkspace(workspace),
  }));

  return (
    <Space className={styles.WorkspaceSelection}>
      {userWorkspaces.map((workspace) => (
        <Button
          type="default"
          key={workspace.key}
          icon={workspace.logo}
          className={styles.WorkspaceButton}
          onClick={workspace.optionOnClick}
        >
          <Typography.Text className={styles.WorkspaceButtonLabel}>
            {workspace.label}
          </Typography.Text>
        </Button>
      ))}
    </Space>
  );
};

const WorkspaceSelectionModalButton: React.FC<WorkspaceSelectionProps> = ({
  processData,
  versionInfo,
}) => {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // prefetch the workspaces if possible (this will reduce the loading time perceived by the user if some time elapses before they click the button)
  useQuery({
    queryKey: ['workspaces', session.data?.user.id],
    queryFn: async () => getWorkspacesQueryFunction(session.data?.user.id as string),
    enabled: !!session.data?.user.id,
  });

  useEffect(() => {
    // if the user returns after having been redirected to the login page open the modal automatically
    if (session.status === 'authenticated' && searchParams.get('redirected') === 'true') {
      setIsModalOpen(true);
      // prevent the modal from always opening on subsequent reloads of the page
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('redirected');
      router.replace(`${pathname}?${newSearchParams}`);
    }
  }, [session, searchParams]);

  const redirectToLoginPage = () => {
    const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}&redirected=true`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    router.push(loginPath);
  };

  const handleAddToWorkspace = () => {
    if (session.status === 'authenticated') setIsModalOpen(true);
    else redirectToLoginPage();
  };

  return (
    <>
      <Button size="large" onClick={handleAddToWorkspace}>
        Add to your workspace
      </Button>
      <Modal
        title={<div style={{ textAlign: 'center', padding: '10px' }}>Select your workspace</div>}
        open={isModalOpen}
        closeIcon={false}
        onCancel={() => setIsModalOpen(false)}
        zIndex={200}
        footer={
          <Button onClick={() => setIsModalOpen(false)} style={{ border: '1px solid black' }}>
            Close
          </Button>
        }
      >
        {session.status === 'authenticated' && (
          <Suspense
            fallback={
              <Spin size="large" tip="Loading Workspaces">
                <div style={{ padding: 50 }} />
              </Spin>
            }
          >
            <WorkspaceSelection processData={processData} versionInfo={versionInfo} />
          </Suspense>
        )}
      </Modal>
    </>
  );
};

export default WorkspaceSelectionModalButton;
