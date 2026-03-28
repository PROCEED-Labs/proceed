'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Spin } from 'antd';
import { getProcess } from '@/lib/data/db/process';
import { Environment } from '@/lib/data/environment-schema';
import { InstanceInfo } from '@/lib/engines/deployment';
import { instanceSettings, SettingsOption } from './settings-modal';
import { ImportsInfo, getSVGWithInstanceColoring } from './documentation-page-utils';
import { ElementInfo } from './table-of-content';
import SharedViewerLayout from './shared-viewer-layout';
import InstanceDocumentContent from './instance-document-content';
import { useProcessHierarchy } from './use-process-hierarchy';
import { ColorOptions } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-coloring';

const defaultInstanceSettingValues = instanceSettings.map(({ value }) => value);

type InstanceDocumentationPageProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  isOwner: boolean;
  userWorkspaces: Environment[];
  defaultSettings?: string[];
  availableImports: ImportsInfo;
  instance: InstanceInfo;
  coloring: ColorOptions;
};

const InstanceDocumentationPage: React.FC<InstanceDocumentationPageProps> = ({
  processData,
  isOwner,
  userWorkspaces,
  defaultSettings,
  availableImports,
  instance,
  coloring,
}) => {
  const [checkedSettings, setCheckedSettings] = useState<string[]>(
    defaultSettings || defaultInstanceSettingValues,
  );

  // Stable callbacks so the hook's useEffect does not rerun on every render
  const getRootSvg = useCallback(
    (bpmn: string) => getSVGWithInstanceColoring(bpmn, instance, coloring),
    [instance, coloring],
  );

  const enrichElement = useCallback(
    (el: any, node: Omit<ElementInfo, 'instanceStatus'>): ElementInfo => ({
      ...node,
      instanceStatus: {
        token: instance.tokens.find((t) => t.currentFlowElementId === el.id),
        logEntries: instance.log.filter((l) => l.flowElementId === el.id),
      },
    }),
    [instance],
  );

  const { processHierarchy, versionInfo } = useProcessHierarchy({
    processData,
    availableImports,
    getRootSvg,
    enrichElement,
  });

  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      setTimeout(window.print, 100);
    }
  }, [processHierarchy, defaultSettings]);

  const activeSettings = Object.fromEntries(checkedSettings.map((k) => [k, true]));
  const shortInstanceId = instance.processInstanceId.slice(-8);

  return (
    <SharedViewerLayout
      processData={processData}
      isOwner={isOwner}
      userWorkspaces={userWorkspaces}
      versionInfo={versionInfo}
      processHierarchy={processHierarchy}
      checkedSettings={checkedSettings}
      onSettingsConfirm={setCheckedSettings}
      availableSettings={instanceSettings}
      activeSettings={activeSettings}
      title={`${processData.name} — Instance …${shortInstanceId}`}
    >
      {!processHierarchy ? (
        <Spin tip="Loading instance data" size="large" style={{ top: '50px' }}>
          <div />
        </Spin>
      ) : (
        <InstanceDocumentContent
          processData={processData}
          processHierarchy={processHierarchy}
          versionInfo={versionInfo}
          instance={instance}
          settings={activeSettings}
        />
      )}
    </SharedViewerLayout>
  );
};

export default InstanceDocumentationPage;
