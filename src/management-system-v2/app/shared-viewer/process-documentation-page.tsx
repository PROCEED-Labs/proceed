'use client';

import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { getProcess } from '@/lib/data/db/process';
import { Environment } from '@/lib/data/environment-schema';
import { settingsOptions, settings, SettingsOption } from './settings-modal';
import ProcessDocumentContent from './process-document-content';
import SharedViewerLayout from './shared-viewer-layout';
import { useProcessHierarchy } from './use-process-hierarchy';
import { buildProcessTocItems, ImportsInfo } from './documentation-page-utils';

type BPMNSharedViewerProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  isOwner: boolean;
  userWorkspaces: Environment[];
  defaultSettings?: SettingsOption;
  availableImports: ImportsInfo;
};

const ProcessDocumentationPage: React.FC<BPMNSharedViewerProps> = ({
  processData,
  isOwner,
  userWorkspaces,
  defaultSettings,
  availableImports,
}) => {
  const [checkedSettings, setCheckedSettings] = useState<string[]>(
    defaultSettings || settingsOptions,
  );

  const { processHierarchy, versionInfo } = useProcessHierarchy({
    processData,
    availableImports,
  });

  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      setTimeout(window.print, 100);
    }
  }, [processHierarchy, defaultSettings]);

  const activeSettings = Object.fromEntries(checkedSettings.map((k) => [k, true]));

  return (
    <SharedViewerLayout
      processData={processData}
      isOwner={isOwner}
      userWorkspaces={userWorkspaces}
      versionInfo={versionInfo}
      processHierarchy={processHierarchy}
      checkedSettings={checkedSettings}
      onSettingsConfirm={setCheckedSettings}
      availableSettings={settings}
      activeSettings={activeSettings}
      title={processData.name}
      extraRootItems={
        processHierarchy ? buildProcessTocItems(processHierarchy, activeSettings) : undefined
      }
    >
      {!processHierarchy ? (
        <Spin tip="Loading process data" size="large" style={{ top: '50px' }}>
          <div />
        </Spin>
      ) : (
        <ProcessDocumentContent
          settings={activeSettings as any}
          processHierarchy={processHierarchy}
          processData={processData}
          version={versionInfo}
        />
      )}
    </SharedViewerLayout>
  );
};

export default ProcessDocumentationPage;
