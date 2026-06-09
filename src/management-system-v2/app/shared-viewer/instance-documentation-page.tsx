'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import { getProcess } from '@/lib/data/db/process';
import { Environment } from '@/lib/data/environment-schema';
import { instanceSettings } from './settings-modal';
import {
  ImportsInfo,
  getSVGWithInstanceColoring,
  buildInstanceTocItems,
} from './documentation-page-utils';
import { ElementInfo } from './table-of-content';
import SharedViewerLayout from './shared-viewer-layout';
import InstanceDocumentContent from './instance-document-content';
import { useProcessHierarchy } from './use-process-hierarchy';
import { ColorOptions } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-coloring';
import { AnchorLinkItemProps } from 'antd/es/anchor/Anchor';
import { ExtendedInstanceInfo } from '@/lib/data/instance';

const defaultInstanceSettingValues = instanceSettings.map(({ value }) => value);

type InstanceDocumentationPageProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  isOwner: boolean;
  userWorkspaces: Environment[];
  defaultSettings?: string[];
  availableImports: ImportsInfo;
  instance: ExtendedInstanceInfo;
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

  const { processHierarchy: rawHierarchy, versionInfo } = useProcessHierarchy({
    processData,
    availableImports,
    getRootSvg,
  });

  const processHierarchy = useMemo(() => {
    if (!rawHierarchy) return undefined;

    function enrichNode(node: ElementInfo): ElementInfo {
      return {
        ...node,
        instanceStatus: {
          token: instance.tokens.find((t) => t.currentFlowElementId === node.id),
          logEntries: instance.log.filter((l) => l.flowElementId === node.id),
        },
        children: node.children?.map(enrichNode),
        boundaryEvents: node.boundaryEvents?.map(enrichNode),
      };
    }

    return enrichNode(rawHierarchy);
  }, [rawHierarchy, instance]);
  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      setTimeout(window.print, 100);
    }
  }, [processHierarchy, defaultSettings]);

  const activeSettings = Object.fromEntries(checkedSettings.map((k) => [k, true]));
  const shortInstanceId = instance.processInstanceId.slice(-8);

  const extraRootItems = useMemo(
    (): AnchorLinkItemProps[] =>
      processHierarchy ? buildInstanceTocItems(processHierarchy, activeSettings, instance) : [],
    [processHierarchy, activeSettings, instance],
  );

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
      title={`${processData.name} — Execution ...${shortInstanceId}`}
      extraRootItems={extraRootItems}
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
