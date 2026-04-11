'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import { getProcess } from '@/lib/data/db/process';
import { Environment } from '@/lib/data/environment-schema';
import { InstanceInfo } from '@/lib/engines/deployment';
import { instanceSettings, SettingsOption } from './settings-modal';
import {
  ImportsInfo,
  getSVGWithInstanceColoring,
  getElementTypeLabel,
  sortInstanceChildren,
  isInstanceElementEmpty,
  hasVariableChangesForElement,
} from './documentation-page-utils';
import { ElementInfo } from './table-of-content';
import SharedViewerLayout from './shared-viewer-layout';
import InstanceDocumentContent from './instance-document-content';
import { useProcessHierarchy } from './use-process-hierarchy';
import { ColorOptions } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-coloring';
import { AnchorLinkItemProps } from 'antd/es/anchor/Anchor';

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

  function buildElementChildren(node: ElementInfo): AnchorLinkItemProps[] {
    const hasLog = !!node.instanceStatus?.logEntries?.length;
    const hasToken = !!node.instanceStatus?.token;
    const children: AnchorLinkItemProps[] = [];

    if (activeSettings.showElementSVG) {
      children.push({
        key: `${node.id}_diagram`,
        href: `#${node.id}_diagram_page`,
        title: 'Diagram Element',
      });
    }
    if (node.description) {
      children.push({
        key: `${node.id}_description`,
        href: `#${node.id}_description_page`,
        title: 'Description',
      });
    }
    if ((hasLog || hasToken) && activeSettings.showInstanceStatus) {
      children.push({
        key: `${node.id}_execution_log`,
        href: `#${node.id}_execution_log_page`,
        title: 'Execution Log',
      });
    }
    if (activeSettings.showInstanceVariables) {
      // Only add if variables actually changed for this element
      if (hasVariableChangesForElement(instance, node)) {
        children.push({
          key: `${node.id}_variable_changes`,
          href: `#${node.id}_variable_changes_page`,
          title: 'Variable Changes',
        });
      }
    }
    return children;
  }

  function buildDetailedLogItems(nodes: ElementInfo[]): AnchorLinkItemProps[] {
    return nodes
      .filter((node) => !activeSettings.hideEmpty || !isInstanceElementEmpty(node))
      .map((node) => ({
        key: node.id,
        href: `#${node.id}_page`,
        title: getElementTypeLabel(node),
        children: buildElementChildren(node),
      }));
  }
  const sortedChildren = processHierarchy
    ? sortInstanceChildren(processHierarchy.children || [])
    : [];

  const extraRootItems = useMemo(
    (): AnchorLinkItemProps[] => [
      {
        key: 'process_overview',
        href: '#process_overview_page',
        title: 'Process Overview',
        children: [
          { key: 'process_summary', href: '#process_summary_page', title: 'Summary' },
          { key: 'process_diagram', href: '#process_diagram_page', title: 'Process Diagram' },
        ],
      },
      {
        key: 'execution_overview',
        href: '#execution_overview_page',
        title: 'Execution Overview',
        children: [
          { key: 'execution_summary', href: '#execution_summary_page', title: 'Summary' },
          ...(activeSettings.showInstanceVariables
            ? [
                {
                  key: 'end_states_variables',
                  href: '#end_states_variables_page',
                  title: 'End States of Process Variables',
                },
              ]
            : []),
        ],
      },
      {
        key: 'detailed_execution_log',
        href: '#detailed_execution_log_page',
        title: 'Detailed Execution Log',
        children: processHierarchy ? buildDetailedLogItems(sortedChildren) : [],
      },
    ],
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
      title={`${processData.name} — Instance …${shortInstanceId}`}
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
          extraRootItems={extraRootItems}
        />
      )}
    </SharedViewerLayout>
  );
};

export default InstanceDocumentationPage;
