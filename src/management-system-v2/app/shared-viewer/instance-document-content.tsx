'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Grid, Image, Table, Typography } from 'antd';
import cn from 'classnames';
import { getProcess } from '@/lib/data/db/process';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString } from '@/lib/utils';
import { useEnvironment } from '@/components/auth-can';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { ElementInfo } from './table-of-content';
import { VersionInfo } from './process-document';
import styles from './process-document.module.scss';
import { statusToType } from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';
import {
  getElementTypeLabel,
  isInstanceElementEmpty,
  getVariablesForElement,
  buildInstanceTocItems,
  getSubprocessLabel,
  resolveElementImageUrl,
  separateChildren,
} from './documentation-page-utils';
import TableOfContents from './table-of-content';
import { fromCustomUTCString } from '@/lib/helpers/timeHelper';
import { AnchorLinkItemProps } from 'antd/es/anchor/Anchor';
import ProcessDetailsTable from '@/components/doc-process-details-table';
import ElementSections from '@/components/doc-element-sections';
import ExecutionLogTable from './instance-doc-tables/execution-log-table';
import FinalVariablesTable from './instance-doc-tables/final-variables-table';

const { Title, Text, Paragraph } = Typography;

type Props = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  processHierarchy: ElementInfo;
  versionInfo: VersionInfo;
  instance: InstanceInfo;
  settings: Record<string, boolean>;
  extraRootItems: AnchorLinkItemProps[];
};

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
      const mainPages: React.JSX.Element[] = [];
      const subPages: React.JSX.Element[] = [];
      const sorted = processHierarchy.children || [];

      const { mainChildren, subprocessChildren } = separateChildren(sorted);

      // Render main elements + collapsed subprocesses in main log
      for (const child of mainChildren) {
        await renderDetailedElement(child, mainPages);
      }
      // Collapsed subprocesses also appear in main log
      for (const child of subprocessChildren) {
        if (child.nestedSubprocess) {
          await renderDetailedElement(child, mainPages);
        }
      }

      // All subprocess sections at the end
      for (const child of subprocessChildren) {
        await renderSubprocessSection(child, subPages);
      }

      setDetailedPages([...mainPages, ...subPages]);
    };
    buildPages();
  }, [processHierarchy, settings, instance]);

  async function renderSubprocessSection(node: ElementInfo, pages: React.JSX.Element[]) {
    const subLabel = getSubprocessLabel(node);

    pages.push(
      <div
        key={`subprocess_${node.id}_section`}
        className={cn(styles.ElementPage, styles.ContainerPage)}
      >
        <Title id={`subprocess_${node.id}_page`} level={2}>
          {subLabel}
        </Title>

        {/* Summary */}
        {node.description && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`subprocess_${node.id}_description_page`}>
              Summary
            </Title>
            <div
              className="toastui-editor-contents"
              dangerouslySetInnerHTML={{ __html: node.description }}
            />
          </div>
        )}

        {/* Full subprocess diagram */}
        <div className={styles.MetaInformation}>
          <Title level={3} id={`subprocess_${node.id}_diagram_page`}>
            Process Diagram
          </Title>
          <div
            className={styles.ElementCanvas}
            style={{ display: 'flex', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{
              __html: node.nestedSubprocess?.planeSvg || node.svg,
            }}
          />
        </div>

        {/* Element Details heading */}
        {node.children?.length ? (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`subprocess_${node.id}_elements_page`}>
              {`${subLabel} — Element Details`}
            </Title>
          </div>
        ) : null}
      </div>,
    );

    // Render each child element with full execution log
    if (node.children?.length) {
      for (const child of node.children) {
        await renderDetailedElement(child, pages, true);
      }
    }
  }
  /**
   * Renders one BPMN element as a Detailed Execution Log entry.
   * Recurses into subprocess children.
   */
  async function renderDetailedElement(
    node: ElementInfo,
    pages: React.JSX.Element[],
    isInsideSubprocess = false,
  ) {
    const { token, logEntries } = node.instanceStatus || {};
    const hasLog = !!logEntries?.length;
    const hasToken = !!token;

    // Skip if nothing to show
    if (!settings.hideEmpty && isInstanceElementEmpty(node)) return;

    // Get timing for variable matching
    const startTime = logEntries?.[0]?.startTime ?? token?.currentFlowElementStartTime;
    const endTime = logEntries?.[logEntries.length - 1]?.endTime;
    const changedVariables = settings.showInstanceVariables
      ? getVariablesForElement(instance, node.id, startTime, endTime)
      : [];

    const resolvedImageUrl = await resolveElementImageUrl(
      node.image,
      processData.id,
      environment.spaceId,
      shareToken,
      getImage,
    );

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
      <div
        key={`element_${node.id}_page`}
        className={cn(styles.ElementPage, isInsideSubprocess ? styles.SubprocessChild : undefined)}
      >
        {/* Element heading: level 3 as child of Detailed Execution Log (level 2) */}
        <Title id={`${node.id}_page`} level={isInsideSubprocess ? 4 : 3}>
          {label}
        </Title>

        {/* Diagram Element */}
        <ElementSections
          node={node}
          settings={settings}
          resolvedImageUrl={resolvedImageUrl}
          headingLevel={isInsideSubprocess ? 5 : 4}
        />

        {/* Execution Log */}
        {settings.showInstanceStatus && (
          <div className={styles.MetaInformation}>
            <Title level={isInsideSubprocess ? 5 : 4} id={`${node.id}_execution_log_page`}>
              Execution Log
            </Title>
            <ExecutionLogTable rows={logRows} />
          </div>
        )}

        {/* Variable Changes if happened */}
        {changedVariables.length > 0 && (
          <div className={styles.MetaInformation}>
            <Title level={isInsideSubprocess ? 5 : 4} id={`${node.id}_variable_changes_page`}>
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
          <div className={styles.TitleHeader}>
            <div className={styles.TitleProcessId}>{processData.userDefinedId}</div>
            <Title style={{ marginTop: 0 }}>{processData.name}</Title>
          </div>
          <div className={styles.TitleInfos}>
            <div style={{ fontSize: '14px' }}>
              Initiated By: {(processData as any).processInitiatorName}
            </div>
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
                  Version Created On:{' '}
                  {versionInfo.versionCreatedOn
                    ? generateDateString(fromCustomUTCString(versionInfo.versionCreatedOn), true)
                    : 'Unknown'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px' }}>Version: Latest</div>
            )}
            <div style={{ fontSize: '14px' }}>Execution ID: {instance.processInstanceId}</div>
            <div style={{ fontSize: '14px' }}>
              Started: {generateDateString(new Date(instance.globalStartTime), true)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span>State:</span>
              <Alert
                style={{ padding: '0 4px', fontSize: '7.5px' }}
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
              extraRootItems={buildInstanceTocItems(processHierarchy, settings, instance, true)}
            />
          </div>
        )}

        {/* Process Overview */}
        <div className={cn(styles.ElementPage, styles.ContainerPage)}>
          <Title id="process_overview_page" level={2}>
            Process Overview
          </Title>

          {/* Summary: process description */}
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
          <ProcessDetailsTable processData={processData} versionInfo={versionInfo} />
        </div>

        {/* Execution Overview */}
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
                {
                  dataIndex: 'label',
                  key: 'label',
                  width: 200,
                  render: (v) => <Text strong>{v}</Text>,
                },
                { dataIndex: 'value', key: 'value' },
              ]}
              dataSource={(() => {
                const activeStates = [
                  'RUNNING',
                  'READY',
                  'PAUSED',
                  'PAUSING',
                  'DEPLOYMENT-WAITING',
                  'WAITING',
                ];
                const isTerminal = !instance.instanceState.some((s) => activeStates.includes(s));

                // Derive end time from the last log entry that has an endTime
                const endTime = isTerminal
                  ? instance.log.reduce<number | undefined>((latest, entry) => {
                      if (!entry.endTime) return latest;
                      return latest === undefined || entry.endTime > latest
                        ? entry.endTime
                        : latest;
                    }, undefined)
                  : undefined;

                return [
                  { label: 'Execution Id', value: instance.processInstanceId },
                  {
                    label: 'Started',
                    value: generateDateString(new Date(instance.globalStartTime), true),
                  },
                  {
                    label: 'Ended',
                    value: endTime ? generateDateString(new Date(endTime), true) : '—',
                  },
                  {
                    label: 'Overall State',
                    value: (
                      <Alert
                        style={{ display: 'inline-flex', fontSize: '14px' }}
                        type={statusToType(instance.instanceState[0])}
                        message={instance.instanceState[0]}
                        showIcon
                      />
                    ),
                  },
                ];
              })()}
            />
          </div>

          {/* End States of Process Variables */}
          {settings.showInstanceVariables &&
            instance.variables &&
            Object.keys(instance.variables).length > 0 && (
              <div className={styles.MetaInformation}>
                <Title level={3} id="end_states_variables_page">
                  End States of Process Variables
                </Title>
                <Paragraph>
                  The following table lists the final states of the process variables for the
                  executed process.
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
          {detailedPages}
        </div>
      </div>
    </div>
  );
};

export default InstanceDocumentContent;
