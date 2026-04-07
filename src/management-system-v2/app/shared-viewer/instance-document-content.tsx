'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Image, Spin, Table, Typography } from 'antd';
import cn from 'classnames';
import { getProcess } from '@/lib/data/db/process';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import { useEnvironment } from '@/components/auth-can';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { ElementInfo } from './table-of-content';
import { VersionInfo } from './process-document';
import styles from './process-document.module.scss';
import { statusToType } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';
import { Grid } from 'antd';
import TableOfContents from './table-of-content';
const { Title, Text } = Typography;

type Props = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  processHierarchy: ElementInfo;
  versionInfo: VersionInfo;
  instance: InstanceInfo;
  settings: Record<string, boolean>;
};

const InstanceDocumentContent: React.FC<Props> = ({
  processData,
  processHierarchy,
  versionInfo,
  instance,
  settings,
}) => {
  const environment = useEnvironment();
  const query = useSearchParams();
  const shareToken = query.get('token');
  const { download: getImage } = useFileManager({ entityType: EntityType.PROCESS });
  const [pages, setPages] = useState<React.JSX.Element[]>([]);
  const breakpoint = Grid.useBreakpoint();

  useEffect(() => {
    const buildPages = async () => {
      const result: React.JSX.Element[] = [];
      await renderElement(processHierarchy, result, true);
      setPages(result);
    };
    buildPages();
  }, [processHierarchy, settings, instance]);

  /**
   * Recursively renders each BPMN element as a document section,
   * including instance status and log entries specific to that element.
   */
  async function renderElement(node: ElementInfo, pages: React.JSX.Element[], isRoot = false) {
    const isContainer = !!node.children?.length;

    // Respect hideEmpty setting, skip if nothing to show
    if (
      settings.hideEmpty &&
      !node.description &&
      !node.meta &&
      !node.milestones &&
      !node.image &&
      !node.children?.length &&
      !node.instanceStatus?.token &&
      !node.instanceStatus?.logEntries?.length
    ) {
      return;
    }

    let elementSvg = node.svg;
    let elementLabel = node.name || `<${node.id}>`;
    let { milestones, meta, description, importedProcess, image } = node;

    if (settings.nestedSubprocesses && node.nestedSubprocess) {
      elementSvg = node.nestedSubprocess.planeSvg;
    } else if (settings.importedProcesses && importedProcess) {
      elementSvg = importedProcess.planeSvg;
      elementLabel = importedProcess.name!;
      ({ milestones, meta, description } = importedProcess);
    }

    const { fileUrl: imageUrl } = await getImage({
      entityId: processData.id,
      filePath: image,
      shareToken,
    }).catch(() => ({ fileUrl: undefined }));

    const resolvedImageUrl =
      image &&
      (imageUrl ??
        `/api/private/${environment.spaceId || 'unauthenticated'}/processes/${
          processData.id
        }/images/${image}?shareToken=${shareToken}`);

    pages.push(
      <div
        key={`element_${node.id}_page`}
        className={cn(styles.ElementPage, { [styles.ContainerPage]: isContainer })}
      >
        {/* ── Element header + SVG ── */}
        <div className={styles.ElementOverview}>
          <Title id={`${node.id}_page`} level={2}>
            {elementLabel}
          </Title>
          {(settings.showElementSVG || isContainer) && (
            <div
              className={styles.ElementCanvas}
              dangerouslySetInnerHTML={{ __html: elementSvg }}
            />
          )}
        </div>

        {/* Root-level: instance summary + full variable table */}
        {isRoot && (
          <>
            <InstanceSummarySection instance={instance} />
            {settings.showInstanceVariables && <InstanceVariablesSection instance={instance} />}
          </>
        )}

        {/* process version info */}
        {settings.importedProcesses && importedProcess?.versionId && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${node.id}_version_page`}>
              Version Information
            </Title>
            {importedProcess.versionName && (
              <p>
                <b>Version:</b> {importedProcess.versionName}
              </p>
            )}
            {importedProcess.versionDescription && (
              <p>
                <b>Version Description:</b> {importedProcess.versionDescription}
              </p>
            )}
          </div>
        )}

        {/* General description */}
        {description && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${node.id}_description_page`}>
              General Description
            </Title>
            <div
              className="toastui-editor-contents"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}

        {/* Overview image */}
        {resolvedImageUrl && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${node.id}_image_page`}>
              Overview Image
            </Title>
            <Image
              alt="Element overview image"
              style={{
                width: 'auto',
                maxWidth: '80%',
                height: '300px',
                position: 'relative',
                left: '50%',
                transform: 'translate(-50%)',
              }}
              src={resolvedImageUrl}
              width="100%"
            />
          </div>
        )}

        {/* Meta data */}
        {meta && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${node.id}_meta_page`}>
              Meta Data
            </Title>
            <Table
              pagination={false}
              rowKey="key"
              columns={[
                { title: 'Name', dataIndex: 'key', key: 'key' },
                { title: 'Value', dataIndex: 'val', key: 'value' },
              ]}
              dataSource={Object.entries(meta).map(([key, val]) => ({ key, val }))}
            />
          </div>
        )}

        {/* Milestones */}
        {milestones && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${node.id}_milestone_page`}>
              Milestones
            </Title>
            <Table
              pagination={false}
              rowKey="id"
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id' },
                { title: 'Name', dataIndex: 'name', key: 'name' },
                {
                  title: 'Description',
                  dataIndex: 'description',
                  key: 'description',
                  render: (value) => (
                    <div
                      className="toastui-editor-contents"
                      dangerouslySetInnerHTML={{ __html: value }}
                    />
                  ),
                },
              ]}
              dataSource={milestones}
            />
          </div>
        )}

        {/* Instance status for this element */}
        {settings.showInstanceStatus && <ElementInstanceStatus node={node} instance={instance} />}
      </div>,
    );

    // Recurse into children
    if (
      (settings.nestedSubprocesses || !node.nestedSubprocess) &&
      (settings.importedProcesses || !node.importedProcess) &&
      node.children
    ) {
      for (const child of node.children) {
        await renderElement(child, pages);
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
        <div className={cn(styles.Title, { [styles.TitlePage]: settings.titlepage })}>
          <Title>{processData.name}</Title>
          <div className={styles.TitleInfos}>
            <div>Owner: {processData.creatorId?.split('|').pop()}</div>
            {versionInfo.id ? (
              <>
                <div>Version: {versionInfo.name || versionInfo.id}</div>
                {versionInfo.description && (
                  <div>Version Description: {versionInfo.description}</div>
                )}
              </>
            ) : (
              <div>Version: Latest</div>
            )}
            {/* Instance-specific identity in the title block */}
            <div>Instance: …{instance.processInstanceId.slice(-8)}</div>
            <div>
              Instance Started: {generateDateString(new Date(instance.globalStartTime), true)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Instance State:</span>
              <Alert
                style={{ padding: '0 8px', fontSize: '12px' }}
                type={statusToType(instance.instanceState[0])}
                message={instance.instanceState[0]}
                showIcon
              />
            </div>
          </div>
        </div>

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
              extraRootItems={[
                ...(settings.showInstanceStatus
                  ? [{ key: 'instance_summary', href: '', title: 'Instance Summary' }]
                  : []),
                ...(settings.showInstanceVariables
                  ? [{ key: 'instance_variables', href: '', title: 'Instance Variables' }]
                  : []),
              ]}
            />
          </div>
        )}

        {...pages}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Instance summary: once at root level
// ─────────────────────────────────────────────
function InstanceSummarySection({ instance }: { instance: InstanceInfo }) {
  const rows = [
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
  ];

  return (
    <div className={styles.MetaInformation}>
      <Title level={3} id="instance_summary_page">
        Instance Summary
      </Title>
      <Table
        pagination={false}
        showHeader={false}
        rowKey="label"
        columns={[
          { dataIndex: 'label', key: 'label', render: (v) => <Text strong>{v}</Text> },
          { dataIndex: 'value', key: 'value' },
        ]}
        dataSource={rows}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Instance variables: process-scoped, root level only
// ─────────────────────────────────────────────
function InstanceVariablesSection({ instance }: { instance: InstanceInfo }) {
  type VariableEntry = { value: unknown; log?: { changedTime: number }[] };

  const rawVariables = (instance.variables || {}) as Record<string, VariableEntry>;

  const rows = Object.entries(rawVariables).map(([name, data]) => {
    const val = data.value;
    const displayValue =
      val === null || val === undefined
        ? '—'
        : typeof val === 'object'
          ? JSON.stringify(val)
          : String(val);

    return {
      name,
      value: displayValue,
      lastChanged: data.log?.at(-1)?.changedTime,
    };
  });

  if (!rows.length) return null;

  return (
    <div className={styles.MetaInformation}>
      <Title level={3} id="instance_variables_page">
        Instance Variables
      </Title>
      <Table
        pagination={false}
        rowKey="name"
        columns={[
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Value', dataIndex: 'value', key: 'value' },
          {
            title: 'Last Changed',
            dataIndex: 'lastChanged',
            key: 'lastChanged',
            render: (t?: number) => (t ? generateDateString(new Date(t), true) : '—'),
          },
        ]}
        dataSource={rows}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Per-element instance status: token + all log entries for this element
// ─────────────────────────────────────────────
function ElementInstanceStatus({ node, instance }: { node: ElementInfo; instance: InstanceInfo }) {
  const { token, logEntries } = node.instanceStatus || {};
  const hasToken = !!token;
  const hasLog = !!logEntries?.length;

  if (!hasToken && !hasLog) return null;

  return (
    <div className={styles.MetaInformation}>
      <Title level={3} id={`${node.id}_instance_status_page`}>
        Instance Status
      </Title>

      {/* Live token info: only present if element is currently active */}
      {hasToken && (
        <div style={{ marginBottom: '1rem' }}>
          <Title level={4}>Current State</Title>
          <Table
            pagination={false}
            showHeader={false}
            rowKey="label"
            columns={[
              {
                dataIndex: 'label',
                key: 'label',
                render: (v) => <Text strong>{v}</Text>,
              },
              { dataIndex: 'value', key: 'value' },
            ]}
            dataSource={[
              {
                label: 'Flow Node State',
                value: (
                  <Alert
                    style={{ display: 'inline-flex' }}
                    type={statusToType(token!.currentFlowNodeState)}
                    message={token!.currentFlowNodeState}
                    showIcon
                  />
                ),
              },
              {
                label: 'Token State',
                value: token!.state,
              },
              {
                label: 'Started',
                value: generateDateString(new Date(token!.currentFlowElementStartTime), true),
              },
              {
                label: 'Progress',
                value: token!.currentFlowNodeProgress
                  ? `${token!.currentFlowNodeProgress.value}%${
                      token!.currentFlowNodeProgress.manual ? ' (manual)' : ''
                    }`
                  : '—',
              },
              {
                label: 'Priority',
                value: token!.priority,
              },
            ]}
          />
        </div>
      )}

      {/* Log entries: all executions of this element in this instance */}
      {hasLog && (
        <div>
          <Title level={4}>Execution Log</Title>
          <Table
            pagination={false}
            rowKey={(row) => `${row.flowElementId}-${row.startTime}`}
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
                render: (t: number) => generateDateString(new Date(t), true),
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
                render: (_: any, row: InstanceInfo['log'][number]) => {
                  const duration =
                    row.endTime && row.startTime ? row.endTime - row.startTime : undefined;
                  return generateDurationString(duration);
                },
              },
              {
                title: 'Machine',
                dataIndex: 'machine',
                key: 'machine',
                render: (m?: InstanceInfo['log'][number]['machine']) =>
                  m ? `${m.name} (${m.id})` : '—',
              },
            ]}
            dataSource={logEntries}
          />
        </div>
      )}
    </div>
  );
}

export default InstanceDocumentContent;
