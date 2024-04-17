'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

import { App, Avatar, Button, Modal, Space, Typography } from 'antd';
import { LaptopOutlined } from '@ant-design/icons';
import { copyProcesses } from '@/lib/data/processes';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from '../../components/bpmn-canvas';
import { Process } from '@/lib/data/process-schema';
import { getAllUserWorkspaces } from '@/lib/sharing/process-sharing';
import { Environment } from '@/lib/data/environment-schema';

type BPMNSharedViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: Process;
  embeddedMode?: boolean;
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();

  const searchParams = useSearchParams();

  const { message } = App.useApp();
  const processBpmn = processData.bpmn;
  const bpmnViewerRef = useRef<BPMNCanvasRef>(null);
  const [workspaces, setWorkspaces] = useState<Environment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (session.status === 'authenticated') {
        const userWorkspaces = await getAllUserWorkspaces(session.data?.user.id as string);
        if (!cancelled) {
          setWorkspaces(userWorkspaces);
        }
        if (searchParams.get('redirected') === 'true') {
          setIsModalOpen(true);
        }
      } else {
        setWorkspaces([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, searchParams]);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const redirectToLoginPage = () => {
    const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}&redirected=true`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    router.push(loginPath);
  };

  const handleCopyToOwnWorkspace = async (workspace: Environment) => {
    const processesToCopy = [
      {
        name: processData.name,
        description: processData.description,
        originalId: processData.id,
      },
    ];

    const copiedProcesses = await copyProcesses(processesToCopy, workspace.id);

    if ('error' in copiedProcesses) {
      message.error(copiedProcesses.error.message);
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      if (copiedProcesses.length === 1) {
        router.push(
          `${workspace.organization ? workspace.id : ''}/processes/${copiedProcesses[0].id}`,
        );
      }
    }
  };

  const userWorkspaces = workspaces.map((workspace, index) => ({
    label: workspace.organization ? workspace.name : 'My Space',
    key: `${workspace.id}-${index}`,
    logo:
      workspace.organization && workspace.logoUrl ? (
        <Avatar size={'large'} src={workspace.logoUrl} />
      ) : (
        <Avatar size={50} icon={<LaptopOutlined style={{ color: 'black' }} />} />
      ),
    optionOnClick: () => handleCopyToOwnWorkspace(workspace),
  }));

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        {!embeddedMode ? (
          <Space>
            {session.status === 'authenticated' ? (
              <>
                <Button onClick={() => setIsModalOpen(true)}>Add to your workspace</Button>
                <Modal
                  title={
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      Select your workspace
                    </div>
                  }
                  open={isModalOpen}
                  closeIcon={false}
                  onCancel={handleModalClose}
                  zIndex={200}
                  footer={
                    <Button onClick={handleModalClose} style={{ border: '1px solid black' }}>
                      Close
                    </Button>
                  }
                >
                  <Space
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    {userWorkspaces.map((workspace) => (
                      <Button
                        type="default"
                        key={workspace.key}
                        icon={workspace.logo}
                        style={{
                          border: '1px solid black',
                          width: '150px',
                          height: '100px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          whiteSpace: 'normal',
                          textOverflow: 'ellipsis',
                          borderColor: 'black',
                          boxShadow: '2px 2px 2px grey',
                        }}
                        onClick={workspace.optionOnClick}
                      >
                        <Typography.Text
                          style={{
                            margin: '5px',
                            textAlign: 'center',
                          }}
                        >
                          {workspace.label}
                        </Typography.Text>
                      </Button>
                    ))}
                  </Space>
                </Modal>
              </>
            ) : (
              <Button onClick={redirectToLoginPage}>Add to your workspace</Button>
            )}
          </Space>
        ) : null}
        <div className="bpmn-viewer" style={{ height: '90vh', width: '90vw' }}>
          <BPMNCanvas
            key={processBpmn}
            ref={bpmnViewerRef}
            className={divProps.className}
            type={'viewer'}
            bpmn={{ bpmn: processBpmn }}
          />
        </div>
      </div>
    </>
  );
};

export default BPMNSharedViewer;
