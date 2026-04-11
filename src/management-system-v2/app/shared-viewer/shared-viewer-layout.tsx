'use client';

import React, { useRef } from 'react';
import { Button, Grid, Space, Tooltip, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import Content from '@/components/content';
import { useRouter } from 'next/navigation';
import { getProcess } from '@/lib/data/db/process';
import { Environment } from '@/lib/data/environment-schema';
import { ElementInfo } from './table-of-content';
import { VersionInfo } from './process-document';
import TableOfContents from './table-of-content';
import WorkspaceSelectionModalButton from './workspace-selection';
import SettingsModal from './settings-modal';
import styles from './documentation-page.module.scss';

type SharedViewerLayoutProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  isOwner: boolean;
  userWorkspaces: Environment[];
  versionInfo: VersionInfo;
  processHierarchy?: ElementInfo;
  checkedSettings: string[];
  onSettingsConfirm: (settings: string[]) => void;
  availableSettings: React.ComponentProps<typeof SettingsModal>['availableSettings'];
  activeSettings: Record<string, boolean>;
  title: React.ReactNode;
  children: React.ReactNode;
  extraRootItems?: React.ComponentProps<typeof TableOfContents>['extraRootItems'];
};

const SharedViewerLayout: React.FC<SharedViewerLayoutProps> = ({
  processData,
  isOwner,
  userWorkspaces,
  versionInfo,
  processHierarchy,
  checkedSettings,
  onSettingsConfirm,
  availableSettings,
  activeSettings,
  title,
  children,
  extraRootItems,
}) => {
  const router = useRouter();
  const breakpoint = Grid.useBreakpoint();
  const mainContent = useRef<HTMLDivElement>(null);
  const contentTableRef = useRef<HTMLDivElement>(null);

  const handleContentTableChange = (currentActiveLink: string) => {
    if (!contentTableRef.current) return;
    const div = contentTableRef.current;
    const activeLink = Array.from(div.getElementsByTagName('a')).find(
      (link) => `#${link.href.split('#')[1]}` === currentActiveLink,
    );
    if (!activeLink) return;
    const divBox = div.getBoundingClientRect();
    const linkBox = activeLink.getBoundingClientRect();
    if (linkBox.bottom > divBox.bottom) div.scrollBy({ top: linkBox.bottom - divBox.bottom });
    else if (linkBox.top < divBox.top) div.scrollBy({ top: linkBox.top - divBox.top });
  };

  return (
    <div className={styles.DocumentationPageContent}>
      <Content
        headerLeft={
          <Space>
            <Button size="large" onClick={() => router.push('/')}>
              Go to PROCEED
            </Button>
            {!isOwner && (
              <WorkspaceSelectionModalButton
                workspaces={userWorkspaces}
                processData={processData}
                versionInfo={versionInfo}
              />
            )}
            <Tooltip title="Print">
              <Button size="large" icon={<PrinterOutlined />} onClick={() => window.print()} />
            </Tooltip>
            <SettingsModal
              checkedSettings={checkedSettings}
              onConfirm={onSettingsConfirm}
              availableSettings={availableSettings}
            />
          </Space>
        }
        headerCenter={
          <Typography.Text strong style={{ padding: '0 5px' }}>
            {title}
          </Typography.Text>
        }
      >
        <div className={styles.MainContent}>
          <div className={styles.ProcessInfoCol} ref={mainContent}>
            {children}
          </div>
          {breakpoint.lg && (
            <div
              className={styles.ContentTableCol}
              ref={contentTableRef}
              style={{
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 100px)',
                position: 'sticky',
                top: 0,
              }}
            >
              <TableOfContents
                settings={activeSettings as any}
                processHierarchy={processHierarchy}
                affix={false}
                getContainer={() => mainContent.current!}
                targetOffset={100}
                onChange={handleContentTableChange}
                extraRootItems={extraRootItems}
              />
            </div>
          )}
        </div>
      </Content>
    </div>
  );
};

export default SharedViewerLayout;
