'use client';

import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { getProcess } from '@/lib/data/db/process';
import { Environment } from '@/lib/data/environment-schema';
import { settingsOptions, settings, SettingsOption } from './settings-modal';
import ProcessDocument from './process-document';
import SharedViewerLayout from './shared-viewer-layout';
import { useProcessHierarchy } from './use-process-hierarchy';
import {
  getElementTypeLabel,
  ImportsInfo,
  isProcessElementEmpty,
} from './documentation-page-utils';

type BPMNSharedViewerProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  isOwner: boolean;
  userWorkspaces: Environment[];
  defaultSettings?: SettingsOption;
  availableImports: ImportsInfo;
};

const BPMNSharedViewer: React.FC<BPMNSharedViewerProps> = ({
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
        processHierarchy
          ? [
              {
                key: 'process_overview',
                href: `#${processHierarchy.id}_page`,
                title: 'Process Overview',
                children: [
                  ...(processHierarchy.description
                    ? [
                        {
                          key: 'summary',
                          href: `#${processHierarchy.id}_description_page`,
                          title: 'Summary',
                        },
                      ]
                    : []),
                  {
                    key: 'process_diagram',
                    href: `#${processHierarchy.id}_diagram_page`,
                    title: 'Process Diagram',
                  },
                  {
                    key: 'process_details',
                    href: '#process_details_page',
                    title: 'Process Details',
                  },
                ],
              },
              {
                key: 'process_element_details',
                href: '#process_element_details_page',
                title: 'Process Element Details',
                children: (processHierarchy.children || [])
                  .filter((child) => activeSettings.hideEmpty || !isProcessElementEmpty(child))
                  .map((child) => ({
                    key: child.id,
                    href: `#${child.id}_page`,
                    title: getElementTypeLabel(child),
                  })),
              },
            ]
          : undefined
      }
    >
      {!processHierarchy ? (
        <Spin tip="Loading process data" size="large" style={{ top: '50px' }}>
          <div />
        </Spin>
      ) : (
        <ProcessDocument
          settings={activeSettings as any}
          processHierarchy={processHierarchy}
          processData={processData}
          version={versionInfo}
        />
      )}
    </SharedViewerLayout>
  );
};

export default BPMNSharedViewer;
