'use client';

import React, { useRef, useState, useEffect, use } from 'react';
import type ViewerType from 'bpmn-js/lib/Viewer';
import Canvas from 'diagram-js/lib/core/Canvas';
import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';
import { Button, Tooltip, Typography, Space, Grid, Spin } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { is as isType } from 'bpmn-js/lib/util/ModelUtil';
import Content from '@/components/content';
import { useRouter } from 'next/navigation';
import { getSVGFromBPMN } from '@/lib/process-export/util';
import styles from './documentation-page.module.scss';
import { getRootFromElement, getDefinitionsVersionInformation } from '@proceed/bpmn-helper';
import SettingsModal, { instanceSettings } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';
import ProcessDocument, { VersionInfo } from './process-document';
import WorkspaceSelectionModalButton from './workspace-selection';
import {
  getTitle,
  getMetaDataFromBpmnElement,
  getChildElements,
  getViewer,
  ImportsInfo,
  getElementSVG,
  getSVGWithInstanceColoring,
} from './documentation-page-utils';
import { Environment } from '@/lib/data/environment-schema';
import { getProcess } from '@/lib/data/db/process';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString, generateDurationString } from '@/lib/utils';
import { Table, Alert } from 'antd';
import { ColorOptions } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-coloring';
import { statusToType } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';

const markdownEditor: Promise<ToastEditorType> =
  typeof window !== 'undefined'
    ? import('@toast-ui/editor')
        .then((mod) => mod.Editor)
        .then((Editor) => {
          const div = document.createElement('div');
          return new Editor({ el: div });
        })
    : (Promise.resolve(null) as any);

// Default settings for instance docs — same as process docs plus instance-specific ones
const defaultInstanceSettings = instanceSettings.map(({ value }) => value);

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
  const router = useRouter();
  const breakpoint = Grid.useBreakpoint();

  const [checkedSettings, setCheckedSettings] = useState<string[]>(
    defaultSettings || defaultInstanceSettings,
  );

  const mainContent = useRef<HTMLDivElement>(null);
  const contentTableRef = useRef<HTMLDivElement>(null);

  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({});

  const mdEditor = use(markdownEditor);

  useEffect(() => {
    async function transform(
      bpmnViewer: ViewerType,
      el: any,
      definitions: any,
      currentRootId?: string,
    ): Promise<ElementInfo> {
      const name = getTitle(el);
      let svg;
      let nestedSubprocess;
      let importedProcess;
      const { meta, milestones, description, image } = getMetaDataFromBpmnElement(el, mdEditor);
      let oldBpmn: string | undefined;

      if (isType(el, 'bpmn:Collaboration') || isType(el, 'bpmn:Process')) {
        svg = await getSVGWithInstanceColoring(processData.bpmn!, instance, coloring);
      } else {
        ({ svg, el, definitions, oldBpmn, nestedSubprocess, importedProcess, currentRootId } =
          await getElementSVG(
            el,
            bpmnViewer,
            mdEditor,
            definitions,
            availableImports,
            currentRootId,
          ));
      }

      const children: ElementInfo[] = [];
      for (const childEl of getChildElements(el)) {
        children.push(await transform(bpmnViewer, childEl, definitions, currentRootId));
      }

      children.sort((a, b) => {
        const aIsContainer = !!a.children?.length;
        const bIsContainer = !!b.children?.length;
        return !aIsContainer ? -1 : !bIsContainer ? 1 : 0;
      });

      if (oldBpmn) await bpmnViewer.importXML(oldBpmn);

      return {
        svg,
        id: el.id,
        name,
        description,
        meta,
        milestones,
        importedProcess,
        nestedSubprocess,
        children,
        image,
      };
    }

    async function loadHierarchy() {
      const viewer = await getViewer(processData.bpmn!);
      const canvas = viewer.get<Canvas>('canvas');
      const root = canvas.getRootElement();
      const definitions = getRootFromElement(root.businessObject);
      const { versionId, name, description, versionCreatedOn } =
        await getDefinitionsVersionInformation(definitions);
      setVersionInfo({ id: versionId, name, description, versionCreatedOn });
      const hierarchy = await transform(
        viewer,
        root.businessObject,
        root.businessObject.$parent,
        undefined,
      );
      setProcessHierarchy(hierarchy);
      viewer.destroy();
    }

    loadHierarchy();
  }, [mdEditor, processData, instance, coloring]);

  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      setTimeout(window.print, 100);
    }
  }, [processHierarchy, defaultSettings]);

  const activeSettings: Record<string, boolean> = Object.fromEntries(
    checkedSettings.map((key) => [key, true]),
  );

  const handleContentTableChange = (currentActiveLink: string) => {
    if (contentTableRef.current) {
      const div = contentTableRef.current;
      const activeLink = Array.from(div.getElementsByTagName('a')).find(
        (link) => `#${link.href.split('#')[1]}` === currentActiveLink,
      );
      if (activeLink) {
        const divBox = div.getBoundingClientRect();
        const linkBox = activeLink.getBoundingClientRect();
        if (linkBox.bottom > divBox.bottom) div.scrollBy({ top: linkBox.bottom - divBox.bottom });
        else if (linkBox.top < divBox.top) div.scrollBy({ top: linkBox.top - divBox.top });
      }
    }
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
              onConfirm={setCheckedSettings}
              availableSettings={instanceSettings}
            />
          </Space>
        }
        headerCenter={
          <Typography.Text strong style={{ padding: '0 5px' }}>
            {processData.name} — Instance {instance.processInstanceId.slice(-8)}
          </Typography.Text>
        }
      >
        <div className={styles.MainContent}>
          <div className={styles.ProcessInfoCol} ref={mainContent}>
            {/* Reuse ProcessDocument for the existing BPMN/meta sections */}
            <ProcessDocument
              settings={activeSettings as any}
              processHierarchy={processHierarchy}
              processData={processData}
              version={versionInfo}
            />

            {/* Instance-specific sections below the BPMN document */}
            {processHierarchy && activeSettings.showInstanceStatus && (
              <InstanceStatusSection instance={instance} />
            )}
            {processHierarchy && activeSettings.showInstanceVariables && (
              <InstanceVariablesSection instance={instance} />
            )}
          </div>

          {breakpoint.lg && (
            <div className={styles.ContentTableCol} ref={contentTableRef}>
              <TableOfContents
                settings={activeSettings as any}
                processHierarchy={processHierarchy}
                affix={false}
                getContainer={() => mainContent.current!}
                targetOffset={100}
                onChange={handleContentTableChange}
              />
            </div>
          )}
        </div>
      </Content>
    </div>
  );
};

/** Read-only summary of the instance execution state */
function InstanceStatusSection({ instance }: { instance: InstanceInfo }) {
  const overallState = instance.instanceState[0];
  const statusType = statusToType(overallState);

  const logColumns = [
    { title: 'Element ID', dataIndex: 'flowElementId', key: 'flowElementId' },
    {
      title: 'State',
      dataIndex: 'executionState',
      key: 'executionState',
      render: (state: string) => <Alert type={statusToType(state)} message={state} showIcon />,
    },
    {
      title: 'Started',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (t: number) => generateDateString(new Date(t), true),
    },
    {
      title: 'Ended',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (t: number) => generateDateString(new Date(t), true),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, row: InstanceInfo['log'][number]) => {
        const duration = row.endTime && row.startTime ? row.endTime - row.startTime : undefined;
        return generateDurationString(duration);
      },
    },
    {
      title: 'Machine',
      dataIndex: 'machine',
      key: 'machine',
      render: (m: InstanceInfo['log'][number]['machine']) => m?.name || '',
    },
  ];

  return (
    <div style={{ marginTop: '2rem' }}>
      <Typography.Title level={2}>Instance Status</Typography.Title>
      <Space style={{ marginBottom: '1rem' }}>
        <Typography.Text strong>Overall State:</Typography.Text>
        <Alert type={statusType} message={overallState} showIcon />
      </Space>
      <Space style={{ marginBottom: '1rem' }}>
        <Typography.Text strong>Started:</Typography.Text>
        <Typography.Text>
          {generateDateString(new Date(instance.globalStartTime), true)}
        </Typography.Text>
      </Space>
      <Typography.Title level={3}>Execution Log</Typography.Title>
      <Table
        rowKey={(row) => `${row.flowElementId}-${row.startTime}`}
        columns={logColumns}
        dataSource={instance.log}
        pagination={false}
        scroll={{ x: true }}
      />
    </div>
  );
}

/** Read-only table of all instance variables */
type InstanceVariable = {
  value: any;
  log?: { changedTime: number }[];
};

function InstanceVariablesSection({ instance }: { instance: InstanceInfo }) {
  const variables = Object.entries(instance.variables as Record<string, InstanceVariable>).map(
    ([name, data]) => ({
      name,
      value:
        typeof data.value === 'object' && data.value !== null
          ? JSON.stringify(data.value)
          : String(data.value ?? ''),
      lastChanged: data.log?.at(-1)?.changedTime,
    }),
  );

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
    {
      title: 'Last Changed',
      dataIndex: 'lastChanged',
      key: 'lastChanged',
      render: (t?: number) => (t ? generateDateString(new Date(t), true) : ''),
    },
  ];

  return (
    <div style={{ marginTop: '2rem' }}>
      <Typography.Title level={2}>Instance Variables</Typography.Title>
      <Table
        rowKey="name"
        columns={columns}
        dataSource={variables}
        pagination={false}
        scroll={{ x: true }}
      />
    </div>
  );
}

export default InstanceDocumentationPage;
