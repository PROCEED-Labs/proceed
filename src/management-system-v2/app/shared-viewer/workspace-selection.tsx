import React, { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Avatar, message, Space, Button, Typography, Modal, Spin, Tooltip, Flex } from 'antd';
import { LaptopOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { copyProcesses } from '@/lib/data/processes';

import { Environment } from '@/lib/data/environment-schema';
import { getProcess } from '@/lib/data/legacy/process';
import { VersionInfo } from './process-document';

import styles from './workspace-selection.module.scss';
import { AiOutlineFolderOpen, AiOutlineFolder } from 'react-icons/ai';

import { MdEdit } from 'react-icons/md';
import { FolderTreeNode, getSpaceFolderTree } from '@/lib/data/folders';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';

type WorkspaceSelectionProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  versionInfo: VersionInfo;
  workspaces: Environment[];
};

const WorkspaceSelection: React.FC<
  WorkspaceSelectionProps & {
    hasEditingPermission: boolean;
    onWorkspaceSelect: (workspace: Environment) => void;
    onFolderSelect: (folder: Omit<FolderTreeNode, 'children'> | null) => void;
  }
> = ({ hasEditingPermission, workspaces, onWorkspaceSelect, onFolderSelect }) => {
  const { download: getLogoUrl } = useFileManager({ entityType: EntityType.ORGANIZATION });
  const [selectedWorkspace, setSelectedWorkspace] = useState<Environment | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Omit<FolderTreeNode, 'children'> | null>(
    null,
  );
  const [selectedSpaceFolderTree, setSelectedSpaceFolderTree] = useState<FolderTreeNode[] | null>(
    null,
  );

  const [workspaceLogos, setWorkspaceLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchLogos = async () => {
      const logos: Record<string, string | null> = {};
      for (const workspace of workspaces) {
        if (workspace.isOrganization) {
          getLogoUrl(workspace.id, '', undefined, {
            onSuccess(data) {
              logos[workspace.id] = data.fileUrl!;
            },
          });
        } else {
          logos[workspace.id] = null;
        }
      }
      setWorkspaceLogos(logos);
    };

    fetchLogos();
  }, [workspaces]);

  const handleWorkspaceClick = async (workspace: Environment) => {
    setSelectedWorkspace(workspace);
    onWorkspaceSelect(workspace);
    const spaceFolderTree = await getSpaceFolderTree(workspace.id);
    setSelectedSpaceFolderTree(spaceFolderTree);
    onFolderSelect(null);
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string, folderName: string) => {
    setExpandedFolders((prev) => {
      const newExpandedFolders = new Set(prev);
      if (newExpandedFolders.has(folderId)) {
        newExpandedFolders.delete(folderId); // Collapse the folder
      } else {
        newExpandedFolders.add(folderId); // Expand the folder
      }
      return newExpandedFolders;
    });
    const folder = { id: folderId, name: folderName };
    setSelectedFolder(folder);
    onFolderSelect(folder);
  };

  const renderFolderTree = (
    folders: FolderTreeNode[],
    expandedFolders: Set<string>,
    toggleFolder: (folderId: string, folderName: string) => void,
    selectedFolder: Omit<FolderTreeNode, 'children'> | null,
  ) => {
    return (
      <ul style={{ listStyleType: 'none', paddingLeft: '20px', position: 'relative' }}>
        {folders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          const isSelected = selectedFolder?.id == folder.id;

          return (
            <li
              key={folder.id}
              style={{
                cursor: 'pointer',
                color: 'grey',
                position: 'relative',
                paddingLeft: '20px',
                borderLeft: '1px solid #ccc',
              }}
            >
              <span
                onClick={() => toggleFolder(folder.id, folder.name ? folder.name : 'root')}
                style={{
                  position: 'relative',
                  color: isSelected ? 'black' : 'inherit',
                  fontWeight: isSelected ? 'bold' : 'normal',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '-20px',
                    width: '20px',
                    height: '1px',
                    backgroundColor: '#ccc',
                    content: '""',
                  }}
                ></span>
                {isExpanded ? (
                  <AiOutlineFolderOpen style={{ marginRight: '8px', fontSize: '1.5em' }} />
                ) : (
                  <AiOutlineFolder style={{ marginRight: '8px', fontSize: '1.5em' }} />
                )}
                {folder.name ? folder.name : 'root'}
              </span>

              {/* Render children if the folder is expanded */}
              {isExpanded && folder.children.length > 0 && (
                <div style={{ marginLeft: '10px' }}>
                  {renderFolderTree(folder.children, expandedFolders, toggleFolder, selectedFolder)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const userWorkspaces = workspaces.map((workspace) => ({
    label: workspace.isOrganization ? workspace.name : 'My Space',
    key: `${workspace.id}`,
    logo:
      workspace.isOrganization && workspace.logo ? (
        <Tooltip title={workspace.name}>
          <Avatar
            size={64}
            src={workspaceLogos[workspace.id]}
            style={{
              border: '2px solid #f0f0f0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          />
        </Tooltip>
      ) : (
        <Tooltip title={workspace.isOrganization ? workspace.name : 'My Space'}>
          <Avatar size={50} icon={<LaptopOutlined style={{ color: '#000' }} />} />
        </Tooltip>
      ),
    optionOnClick: () => handleWorkspaceClick(workspace),
  }));

  return (
    <>
      <Space className={styles.WorkspaceSelection} style={{ overflowX: 'auto', display: 'flex' }}>
        {userWorkspaces.map((workspace) => (
          <Button
            type="default"
            key={workspace.key}
            icon={workspace.logo}
            className={styles.WorkspaceButton}
            onClick={workspace.optionOnClick}
            style={{
              backgroundColor: selectedWorkspace?.id === workspace.key ? '#dcf0fa' : 'white',
              color: selectedWorkspace?.id === workspace.key ? 'white' : 'black',
            }}
          >
            <Typography.Text className={styles.WorkspaceButtonLabel}>
              {workspace.label}
            </Typography.Text>
          </Button>
        ))}
      </Space>
      {hasEditingPermission && (
        <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
          <InfoCircleOutlined style={{ fontSize: '20px', color: 'orange', marginRight: '5px' }} />
          This process will not be copied. You directly edit the original process. This will change
          the process for every other user including this sharing document.
        </div>
      )}
      {!hasEditingPermission && selectedWorkspace && selectedSpaceFolderTree && (
        <div className={styles.WorkspaceInfo}>
          <Typography.Title level={5}>Choose a destination: </Typography.Title>

          {/* Render folder tree */}
          <div>
            {renderFolderTree(
              selectedSpaceFolderTree,
              expandedFolders,
              toggleFolder,
              selectedFolder,
            )}
            {selectedFolder && (
              <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
                Selected folder: {selectedFolder.name}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const WorkspaceSelectionModalButton: React.FC<WorkspaceSelectionProps> = ({
  processData,
  workspaces,

  versionInfo,
}) => {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hasEditingPermission, setHasEditingPermission] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Environment | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Omit<FolderTreeNode, 'children'> | null>(
    null,
  );
  const [isCopyButtonDisabled, setIsCopyButtonDisabled] = useState(true);

  useEffect(() => {
    if (selectedWorkspace && selectedFolder) {
      setIsCopyButtonDisabled(false);
    } else {
      setIsCopyButtonDisabled(true);
    }
  }, [selectedFolder, selectedWorkspace]);

  const copyToWorkspace = async () => {
    if (!selectedWorkspace || !selectedFolder) {
      message.error('Please select a workspace and folder.');
      return;
    }

    const processesToCopy = [
      {
        name: processData.name,
        description: processData.description,
        originalId: processData.id,
        originalVersion: typeof versionInfo.id === 'number' ? `${versionInfo.id}` : undefined,
      },
    ];

    const copiedProcesses = await copyProcesses(
      processesToCopy,
      selectedWorkspace.id,
      selectedFolder.id,
      processData.id,
    );

    if ('error' in copiedProcesses) {
      message.error(copiedProcesses.error.message);
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      if (copiedProcesses.length === 1) {
        router.push(
          `${selectedWorkspace.isOrganization ? selectedWorkspace.id : ''}/processes/${copiedProcesses[0].id}`,
        );
      }
    }
  };

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

  const handleEditButtonClick = () => {
    if (session.status === 'authenticated') setIsModalOpen(true);
    else redirectToLoginPage();
  };

  return (
    <>
      <Tooltip title="Edit">
        <Button size="large" icon={<MdEdit aria-label="edit" />} onClick={handleEditButtonClick} />
      </Tooltip>
      <Modal
        title={<div style={{ textAlign: 'center', padding: '10px' }}>Options for Editing</div>}
        open={isModalOpen}
        closeIcon={false}
        onCancel={() => setIsModalOpen(false)}
        zIndex={200}
        width={600}
        closable={true}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              type="primary"
              onClick={() => alert('To be implemented')}
              style={{ border: '1px solid black' }}
              disabled={!hasEditingPermission}
            >
              Direct Edit
            </Button>

            <div>
              <Button
                type="primary"
                onClick={copyToWorkspace}
                style={{ border: '1px solid black', marginRight: '10px' }}
                disabled={isCopyButtonDisabled || hasEditingPermission}
              >
                Copy and Edit
              </Button>
              <Button onClick={() => setIsModalOpen(false)} style={{ border: '1px solid black' }}>
                Close
              </Button>
            </div>
          </div>
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
            <WorkspaceSelection
              hasEditingPermission={hasEditingPermission}
              workspaces={workspaces}
              processData={processData}
              versionInfo={versionInfo}
              onWorkspaceSelect={setSelectedWorkspace}
              onFolderSelect={setSelectedFolder}
            />
          </Suspense>
        )}
      </Modal>
    </>
  );
};

export default WorkspaceSelectionModalButton;
