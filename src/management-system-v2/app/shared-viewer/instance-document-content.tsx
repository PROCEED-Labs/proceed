'use client';
//////////////////////
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Grid, Image, Table, Typography } from 'antd';
import cn from 'classnames';
import { getProcess } from '@/lib/data/db/process';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString, generateDurationString } from '@/lib/utils';
import { useEnvironment } from '@/components/auth-can';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { ElementInfo } from './table-of-content';
import { VersionInfo } from './process-document';
import styles from './process-document.module.scss';
import { statusToType } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';
import TableOfContents from './table-of-content';
import { fromCustomUTCString } from '@/lib/helpers/timeHelper';
import ElementSections from './element-sections';
import { AnchorLinkItemProps } from 'antd/es/anchor/Anchor';

const { Title, Text, Paragraph } = Typography;

type VariableEntry = { value: unknown; log?: { changedTime: number; changedBy?: string }[] };

type Props = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  processHierarchy: ElementInfo;
  versionInfo: VersionInfo;
  instance: InstanceInfo;
  settings: Record<string, boolean>;
  extraRootItems: AnchorLinkItemProps[];
};

// ─────────────────────────────────────────────
// Helper: get variables changed by or during an element
// ─────────────────────────────────────────────
function getVariablesForElement(
  instance: InstanceInfo,
  elementId: string,
  startTime?: number,
  endTime?: number,
): { name: string; value: string; changedTime: number }[] {
  const rawVariables = (instance.variables || {}) as Record<string, VariableEntry>;
  const result: { name: string; value: string; changedTime: number }[] = [];

  for (const [name, data] of Object.entries(rawVariables)) {
    if (!data.log?.length) continue;

    for (const logEntry of data.log) {
      const displayValue =
        data.value === null || data.value === undefined
          ? '—'
          : typeof data.value === 'object'
            ? JSON.stringify(data.value)
            : String(data.value);

      // If changedBy exists, attach directly to that activity only
      if (logEntry.changedBy) {
        if (logEntry.changedBy === elementId) {
          result.push({ name, value: displayValue, changedTime: logEntry.changedTime });
        }
        continue;
      }

      // if no changedBy then use time-based matching
      if (startTime === undefined) continue;
      const effectiveEnd = endTime ?? Date.now();
      if (logEntry.changedTime >= startTime && logEntry.changedTime <= effectiveEnd) {
        result.push({ name, value: displayValue, changedTime: logEntry.changedTime });
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// Helper: get element type label
// Type: Name or Type: ID
// ─────────────────────────────────────────────
function getElementTypeLabel(node: ElementInfo): string {
  const hasName = node.name && !node.name.startsWith('<');
  const identifier = hasName ? node.name : node.id;
  const type = node.elementType || '';

  if (type.includes('StartEvent')) return `Start Event: ${identifier}`;
  if (type.includes('EndEvent')) return `End Event: ${identifier}`;
  if (type.includes('UserTask')) return `User Task: ${identifier}`;
  if (type.includes('ServiceTask')) return `Service Task: ${identifier}`;
  if (type.includes('ScriptTask')) return `Script Task: ${identifier}`;
  if (type.includes('Task')) return `Task: ${identifier}`;
  if (type.includes('ExclusiveGateway')) return `Exclusive Gateway: ${identifier}`;
  if (type.includes('ParallelGateway')) return `Parallel Gateway: ${identifier}`;
  if (type.includes('Gateway')) return `Gateway: ${identifier}`;
  if (type.includes('SubProcess')) return `Sub Process: ${identifier}`;
  if (type.includes('CallActivity')) return `Call Activity: ${identifier}`;
  return String(identifier);
}

// ─────────────────────────────────────────────
// Helper: sort children
// start events first, end events last
// ─────────────────────────────────────────────
function sortChildren(children: ElementInfo[]): ElementInfo[] {
  const order = (node: ElementInfo) => {
    const type = node.elementType || '';
    if (type.includes('StartEvent')) return 0;
    if (type.includes('EndEvent')) return 3;
    if (node.children?.length) return 2;
    return 1;
  };
  return [...children].sort((a, b) => order(a) - order(b));
}

const InstanceDocumentContent: React.FC<Props> = ({
  processData,
  processHierarchy,
  versionInfo,
  instance,
  settings,
  extraRootItems,
}) => {
  const environment = useEnvironment();
  const breakpoint = Grid.useBreakpoint();
  const query = useSearchParams();
  const shareToken = query.get('token');
  const { download: getImage } = useFileManager({ entityType: EntityType.PROCESS });
  const [detailedPages, setDetailedPages] = useState<React.JSX.Element[]>([]);

  useEffect(() => {
    const buildPages = async () => {
      const result: React.JSX.Element[] = [];
      const sorted = sortChildren(processHierarchy.children || []);
      for (const child of sorted) {
        await renderDetailedElement(child, result);
      }
      setDetailedPages(result);
    };
    buildPages();
  }, [processHierarchy, settings, instance]);

  /**
   * Renders one BPMN element as a Detailed Execution Log entry.
   * Recurses into subprocess children.
   */
  async function renderDetailedElement(node: ElementInfo, pages: React.JSX.Element[]) {
    const { token, logEntries } = node.instanceStatus || {};
    const hasLog = !!logEntries?.length;
    const hasToken = !!token;

    // Skip if nothing to show
    if (
      settings.hideEmpty &&
      !hasToken &&
      !hasLog &&
      !node.description &&
      !node.image &&
      !node.meta
    ) {
      return;
    }

    // Get timing for variable matching
    const startTime = logEntries?.[0]?.startTime ?? token?.currentFlowElementStartTime;
    const endTime = logEntries?.[logEntries.length - 1]?.endTime;
    const changedVariables = settings.showInstanceVariables
      ? getVariablesForElement(instance, node.id, startTime, endTime)
      : [];

    const { fileUrl: imageUrl } = await getImage({
      entityId: processData.id,
      filePath: node.image,
      shareToken,
    }).catch(() => ({ fileUrl: undefined }));

    const resolvedImageUrl =
      node.image &&
      (imageUrl ??
        `/api/private/${environment.spaceId || 'unauthenticated'}/processes/${
          processData.id
        }/images/${node.image}?shareToken=${shareToken}`);

    const label = getElementTypeLabel(node);
    /**
     * Build unified log rows from both token and log entries
     * to show a consistent table
     */
    const logRows: {
      key: string;
      executionState: string;
      startTime?: number;
      endTime?: number;
      machine?: InstanceInfo['log'][number]['machine'];
    }[] = [];

    if (hasLog) {
      logEntries!.forEach((row) => {
        logRows.push({
          key: `${row.flowElementId}-${row.startTime}`,
          executionState: row.executionState,
          startTime: row.startTime,
          endTime: row.endTime,
          machine: row.machine,
        });
      });
    } else if (hasToken) {
      // if element is currently active then show token state in log table
      logRows.push({
        key: token!.tokenId,
        executionState: token!.currentFlowNodeState,
        startTime: token!.currentFlowElementStartTime,
        endTime: undefined,
        machine: undefined,
      });
    }

    pages.push(
      <div key={`element_${node.id}_page`} className={styles.ElementPage}>
        {/* Element heading: level 3 as child of Detailed Execution Log (level 2) */}
        <Title id={`${node.id}_page`} level={3}>
          {label}
        </Title>

        {/* Diagram Element */}
        <ElementSections
          node={node}
          settings={settings}
          resolvedImageUrl={resolvedImageUrl}
          headingLevel={4}
        />

        {/* Execution Log */}
        {logRows.length > 0 && settings.showInstanceStatus && (
          <div className={styles.MetaInformation}>
            <Title level={4} id={`${node.id}_execution_log_page`}>
              Execution Log
            </Title>
            <Table
              pagination={false}
              rowKey="key"
              columns={[
                {
                  title: 'State',
                  dataIndex: 'executionState',
                  key: 'executionState',
                  render: (state: string) => (
                    <Alert
                      style={{ display: 'inline-flex' }}
                      type={statusToType(state)}
                      message={state}
                      showIcon
                    />
                  ),
                },
                {
                  title: 'Started',
                  dataIndex: 'startTime',
                  key: 'startTime',
                  render: (t?: number) => (t ? generateDateString(new Date(t), true) : '—'),
                },
                {
                  title: 'Ended',
                  dataIndex: 'endTime',
                  key: 'endTime',
                  render: (t?: number) => (t ? generateDateString(new Date(t), true) : '—'),
                },
                {
                  title: 'Duration',
                  key: 'duration',
                  render: (_: any, row: (typeof logRows)[number]) => {
                    const duration =
                      row.endTime && row.startTime ? row.endTime - row.startTime : undefined;
                    return generateDurationString(duration);
                  },
                },
                {
                  title: 'Machine',
                  dataIndex: 'machine',
                  key: 'machine',
                  render: (m?: InstanceInfo['log'][number]['machine']) => (m ? m.name : '—'),
                },
              ]}
              dataSource={logRows}
            />
          </div>
        )}

        {/* Variable Changes if happened */}
        {changedVariables.length > 0 && (
          <div className={styles.MetaInformation}>
            <Title level={4} id={`${node.id}_variable_changes_page`}>
              Variable Changes
            </Title>
            <Table
              pagination={false}
              rowKey="name"
              columns={[
                { title: 'Variable', dataIndex: 'name', key: 'name' },
                { title: 'Value', dataIndex: 'value', key: 'value' },
                {
                  title: 'Changed At',
                  dataIndex: 'changedTime',
                  key: 'changedTime',
                  render: (t: number) => generateDateString(new Date(t), true),
                },
              ]}
              dataSource={changedVariables}
            />
          </div>
        )}
      </div>,
    );

    // Recurse into subprocess children
    if ((settings.nestedSubprocesses || !node.nestedSubprocess) && node.children?.length) {
      for (const child of sortChildren(node.children)) {
        await renderDetailedElement(child, pages);
      }
    }
  }

  return (
    <div className={styles.ProcessDocument}>
      {/* Document header (logo + title page) */}
      <div className={styles.Header}>
        <Image src="/proceed-labs-logo.svg" alt="Proceed Logo" width="169.5pt" height="15pt" />
        <h3>www.proceed-labs.org</h3>
      </div>

      <div className={styles.Main}>
        {/* Front Page */}
        <div className={cn(styles.Title, { [styles.TitlePage]: settings.titlepage })}>
          <Title>{processData.name}</Title>
          <div className={styles.TitleInfos}>
            <div style={{ fontSize: '14px' }}>Owner: {processData.creatorId?.split('|').pop()}</div>
            {versionInfo.id ? (
              <>
                <div style={{ fontSize: '14px' }}>
                  Version: {versionInfo.name || versionInfo.id}
                </div>
                {versionInfo.description && (
                  <div style={{ fontSize: '14px' }}>
                    Version Description: {versionInfo.description}
                  </div>
                )}
                <div style={{ fontSize: '14px' }}>
                  Creation Time:{' '}
                  {versionInfo.versionCreatedOn
                    ? generateDateString(fromCustomUTCString(versionInfo.versionCreatedOn), true)
                    : 'Unknown'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px' }}>Version: Latest</div>
            )}
            <div style={{ fontSize: '14px' }}>
              Instance: …{instance.processInstanceId.slice(-8)}
            </div>
            <div style={{ fontSize: '14px' }}>
              Started: {generateDateString(new Date(instance.globalStartTime), true)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span>State:</span>
              <Alert
                style={{ padding: '0 8px', fontSize: '12px' }}
                type={statusToType(instance.instanceState[0])}
                message={instance.instanceState[0]}
                showIcon
              />
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        {settings.tableOfContents && (
          <div
            className={cn(styles.TableOfContents, {
              [styles.WebTableOfContents]: !breakpoint.lg,
              [styles.TableOfContentPage]: settings.titlepage,
            })}
          >
            <Title level={2}>Table Of Contents</Title>
            <TableOfContents
              affix={false}
              getCurrentAnchor={() => ''}
              settings={settings as any}
              processHierarchy={processHierarchy}
              linksDisabled
              extraRootItems={extraRootItems.map((item) => ({
                ...item,
                href: '',
                children: item.children?.map((child) => ({
                  ...child,
                  href: '',
                  children: child.children?.map((grandchild) => ({
                    ...grandchild,
                    href: '',
                  })),
                })),
              }))}
            />
          </div>
        )}

        {/* Process Overview */}
        <div className={cn(styles.ElementPage, styles.ContainerPage)}>
          <Title id="process_overview_page" level={2}>
            Process Overview
          </Title>

          {/* Summary — process description same as process doc */}
          {processHierarchy.description && (
            <div className={styles.MetaInformation}>
              <Title level={3} id="process_summary_page">
                Summary
              </Title>
              <div
                className="toastui-editor-contents"
                dangerouslySetInnerHTML={{ __html: processHierarchy.description }}
              />
            </div>
          )}

          {/* Process Diagram */}
          <div className={styles.MetaInformation}>
            <Title level={3} id="process_diagram_page">
              Process Diagram
            </Title>
            <div
              className={styles.ElementCanvas}
              style={{ display: 'flex', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: processHierarchy.svg }}
            />
          </div>
        </div>

        {/* ── Execution Overview ── */}
        <div className={cn(styles.ElementPage, styles.ContainerPage)}>
          <Title id="execution_overview_page" level={2}>
            Execution Overview
          </Title>

          {/* Summary */}
          <div className={styles.MetaInformation}>
            <Title level={3} id="execution_summary_page">
              Summary
            </Title>
            <Table
              pagination={false}
              showHeader={false}
              rowKey="label"
              columns={[
                { dataIndex: 'label', key: 'label', render: (v) => <Text strong>{v}</Text> },
                { dataIndex: 'value', key: 'value' },
              ]}
              dataSource={[
                { label: 'Instance ID', value: instance.processInstanceId },
                { label: 'Process Version', value: instance.processVersion },
                {
                  label: 'Started',
                  value: generateDateString(new Date(instance.globalStartTime), true),
                },
                {
                  label: 'Overall State',
                  value: (
                    <Alert
                      style={{ display: 'inline-flex' }}
                      type={statusToType(instance.instanceState[0])}
                      message={instance.instanceState[0]}
                      showIcon
                    />
                  ),
                },
              ]}
            />
          </div>

          {/* End States of Process Variables */}
          {settings.showInstanceVariables && (
            <div className={styles.MetaInformation}>
              <Title level={3} id="end_states_variables_page">
                End States of Process Variables
              </Title>
              <Paragraph>
                The following table lists the final states of the process variables for the executed
                process. To view the complete history of changes to the variables throughout the
                process, please refer to the detailed list of process elements below.
              </Paragraph>
              <FinalVariablesTable instance={instance} />
              <Paragraph style={{ marginTop: '1rem', fontStyle: 'italic' }}>
                To view the complete history of changes to the variables throughout the process,
                please refer to the detailed list of process elements below.
              </Paragraph>
            </div>
          )}
        </div>

        {/* Detailed Execution Log */}
        <div className={cn(styles.ElementPage, styles.ContainerPage)}>
          <Title id="detailed_execution_log_page" level={2}>
            Detailed Execution Log
          </Title>
          {...detailedPages}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Final variable states table
// ─────────────────────────────────────────────
function FinalVariablesTable({ instance }: { instance: InstanceInfo }) {
  const rawVariables = (instance.variables || {}) as Record<string, VariableEntry>;

  const rows = Object.entries(rawVariables).map(([name, data]) => ({
    name,
    value:
      data.value === null || data.value === undefined
        ? '—'
        : typeof data.value === 'object'
          ? JSON.stringify(data.value)
          : String(data.value),
    lastChanged: data.log?.at(-1)?.changedTime,
  }));

  if (!rows.length) return null;

  return (
    <Table
      pagination={false}
      rowKey="name"
      columns={[
        { title: 'Variable', dataIndex: 'name', key: 'name' },
        { title: 'Final Value', dataIndex: 'value', key: 'value' },
        {
          title: 'Last Changed',
          dataIndex: 'lastChanged',
          key: 'lastChanged',
          render: (t?: number) => (t ? generateDateString(new Date(t), true) : '—'),
        },
      ]}
      dataSource={rows}
    />
  );
}

export default InstanceDocumentContent;
