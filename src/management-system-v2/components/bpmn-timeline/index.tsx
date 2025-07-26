'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Collapse, Card } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';
import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import useTimelineViewStore from '@/lib/use-timeline-view-store';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { isUserErrorResponse } from '@/lib/user-error';
import { useEnvironment } from '@/components/auth-can';
import { moddle } from '@proceed/bpmn-helper';
import useModelerStateStore from '@/app/(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';

// Import our separated modules
import type {
  BPMNDefinitions,
  BPMNTimelineProps,
  TransformationError,
  TransformationIssue,
  DefaultDurationInfo,
} from './types/types';
import { transformBPMNToGantt } from './core/transform';
import { GanttSettingsModal } from './GanttSettingsModal';
import styles from './styles/BPMNTimeline.module.scss';

const BPMNTimeline = ({ process, ...props }: BPMNTimelineProps) => {
  const disableTimelineView = useTimelineViewStore((state) => state.disableTimelineView);
  const isUnmountingRef = useRef(false);
  // Track the last transformation parameters to prevent duplicate processing in React strict mode
  const lastTransformRef = useRef<string>('');
  const modeler = useModelerStateStore((state) => state.modeler);
  const changeCounter = useModelerStateStore((state) => state.changeCounter);

  const [ganttData, setGanttData] = useState<{
    elements: GanttElementType[];
    dependencies: GanttDependency[];
  }>({ elements: [], dependencies: [] });

  const [errors, setErrors] = useState<TransformationError[]>([]);
  const [warnings, setWarnings] = useState<TransformationIssue[]>([]);
  const [defaultDurations, setDefaultDurations] = useState<DefaultDurationInfo[]>([]);
  const [informationalArtifacts, setInformationalArtifacts] = useState<
    import('./types/types').BPMNInformationalArtifact[]
  >([]);
  const [hasInclusiveGateways, setHasInclusiveGateways] = useState<boolean>(false);
  const [hasComplexGateways, setHasComplexGateways] = useState<boolean>(false);
  const [hasEventBasedGateways, setHasEventBasedGateways] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTimestamp, setNowTimestamp] = useState<number>(0);
  const [ganttSettings, setGanttSettings] = useState<{
    enabled: boolean;
    positioningLogic: 'earliest-occurrence' | 'every-occurrence' | 'latest-occurrence';
    loopDepth: number;
    chronologicalSorting: boolean;
    showLoopIcons: boolean;
    curvedDependencies: boolean;
    renderGateways: boolean;
    showGhostElements: boolean;
    showGhostDependencies: boolean;
  } | null>(null); // Start with null to indicate settings not loaded

  // Add a refresh counter to force re-fetching of settings
  const [settingsRefreshCounter, setSettingsRefreshCounter] = useState(0);

  const { spaceId } = useEnvironment();

  // Fetch gantt view settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsResult = await getSpaceSettingsValues(spaceId, 'process-documentation');

        // Handle userError result from server action (e.g., permission errors)
        if (isUserErrorResponse(settingsResult)) {
          console.warn('Cannot access settings, using defaults:', settingsResult.error.message);
          // Use defaults when settings are not accessible
          setGanttSettings({
            enabled: true,
            positioningLogic: 'earliest-occurrence',
            loopDepth: 1,
            chronologicalSorting: false,
            showLoopIcons: true,
            curvedDependencies: false,
            renderGateways: false,
            showGhostElements: false,
            showGhostDependencies: false,
          });
          return;
        }

        const ganttViewSettings = settingsResult?.['gantt-view'];
        const showGhostElements = ganttViewSettings?.['show-ghost-elements'] ?? false;

        const newSettings = {
          enabled: ganttViewSettings?.enabled ?? true,
          positioningLogic: ganttViewSettings?.['positioning-logic'] ?? 'earliest-occurrence',
          loopDepth: ganttViewSettings?.['loop-depth'] ?? 1,
          chronologicalSorting: ganttViewSettings?.['chronological-sorting'] ?? false,
          showLoopIcons: ganttViewSettings?.['show-loop-icons'] ?? true,
          curvedDependencies: ganttViewSettings?.['curved-dependencies'] ?? false,
          renderGateways: ganttViewSettings?.['render-gateways'] ?? false,
          showGhostElements,
          // Ghost dependencies can only be enabled if ghost elements are enabled
          showGhostDependencies:
            showGhostElements && (ganttViewSettings?.['show-ghost-dependencies'] ?? false),
        };
        setGanttSettings(newSettings);
      } catch (error) {
        console.warn('Failed to fetch gantt view settings, using defaults:', error);
        const defaultShowGhostElements = false;
        setGanttSettings({
          enabled: true,
          positioningLogic: 'earliest-occurrence',
          loopDepth: 1,
          chronologicalSorting: false,
          showLoopIcons: true,
          curvedDependencies: false,
          renderGateways: false,
          showGhostElements: defaultShowGhostElements,
          // Ghost dependencies can only be enabled if ghost elements are enabled
          showGhostDependencies: defaultShowGhostElements && false,
        });
      }
    };

    fetchSettings();
  }, [spaceId, settingsRefreshCounter]);

  useEffect(() => {
    // Reset unmounting flag when component mounts/re-mounts
    isUnmountingRef.current = false;

    // Don't parse until settings are loaded
    if (!ganttSettings) {
      return;
    }

    const parseAndTransform = async () => {
      try {
        let bpmnXml = process.bpmn;

        // If modeler is available, get the current XML from it (includes unsaved changes)
        if (modeler) {
          try {
            const currentXml = await modeler.getXML();
            if (currentXml) {
              bpmnXml = currentXml;
            }
          } catch (error) {
            // If getting current XML fails, fall back to process.bpmn
            console.warn('Failed to get current XML from modeler, using process.bpmn:', error);
          }
        }

        // Create a key to detect duplicate calls (React strict mode prevention)
        const transformKey = JSON.stringify({
          bpmnLength: bpmnXml.length,
          positioningLogic: ganttSettings.positioningLogic,
          loopDepth: ganttSettings.loopDepth,
          chronologicalSorting: ganttSettings.chronologicalSorting,
          renderGateways: ganttSettings.renderGateways,
          showGhostElements: ganttSettings.showGhostElements,
          showGhostDependencies: ganttSettings.showGhostDependencies,
          changeCounter,
        });

        // Prevent duplicate processing in React strict mode
        if (lastTransformRef.current === transformKey) {
          return;
        }
        lastTransformRef.current = transformKey;

        // Parse BPMN XML using moddle
        const { rootElement: definitions } = await moddle.fromXML(bpmnXml);

        // Check if component is still mounted
        if (isUnmountingRef.current) {
          return;
        }

        // Check for special gateways in the process
        const bpmnProcess = (definitions as BPMNDefinitions).rootElements?.[0];
        const hasInclusive =
          bpmnProcess?.flowElements?.some(
            (element: any) => element.$type === 'bpmn:InclusiveGateway',
          ) || false;
        const hasComplex =
          bpmnProcess?.flowElements?.some(
            (element: any) => element.$type === 'bpmn:ComplexGateway',
          ) || false;
        const hasEventBased =
          bpmnProcess?.flowElements?.some(
            (element: any) => element.$type === 'bpmn:EventBasedGateway',
          ) || false;
        setHasInclusiveGateways(hasInclusive);
        setHasComplexGateways(hasComplex);
        setHasEventBasedGateways(hasEventBased);

        // Use a single timestamp for both transformation and red line marker
        const transformationTimestamp = Date.now();
        setNowTimestamp(transformationTimestamp);

        const transformationResult = transformBPMNToGantt(
          definitions as BPMNDefinitions,
          transformationTimestamp,
          ganttSettings.positioningLogic,
          ganttSettings.loopDepth,
          ganttSettings.chronologicalSorting,
          ganttSettings.renderGateways,
          ganttSettings.showGhostElements,
          ganttSettings.showGhostDependencies,
        );

        // Check again if component is still mounted before setting state
        if (isUnmountingRef.current) {
          return;
        }

        setGanttData({
          elements: transformationResult.elements,
          dependencies: transformationResult.dependencies,
        });
        setErrors(transformationResult.errors);
        setWarnings(
          transformationResult.issues?.filter((issue) => issue.severity === 'warning') || [],
        );
        setDefaultDurations(transformationResult.defaultDurations);
        setInformationalArtifacts(transformationResult.informationalArtifacts || []);
        setIsLoading(false);
      } catch (error) {
        // Check if component is still mounted
        if (isUnmountingRef.current) {
          return;
        }

        console.error('Failed to parse BPMN:', error);
        setErrors([
          {
            elementId: 'import',
            elementType: 'BPMN',
            reason: 'Failed to parse BPMN XML',
            severity: 'error' as const,
          },
        ]);
        setIsLoading(false);
      }
    };

    parseAndTransform();

    return () => {
      // Mark that we're in the cleanup phase
      isUnmountingRef.current = true;
    };
  }, [process.bpmn, ganttSettings, modeler, changeCounter]);

  // Handle component unmount separately from BPMN changes
  useEffect(() => {
    return () => {
      // Use a timeout to ensure this runs after React's cleanup
      // Only disable timeline view if we're truly unmounting (not just re-rendering)
      setTimeout(() => {
        if (isUnmountingRef.current) {
          disableTimelineView();
        }
      }, 0);
    };
  }, [disableTimelineView]);

  const headerTitle = (
    <div className={styles.headerContainer}>
      <div className={styles.titleSection}>
        <div className={styles.title}>BPMN Timeline View</div>
        <div className={styles.subtitle}>
          {(isLoading || !ganttSettings) && 'Loading...'}
          {!isLoading && ganttSettings && (
            <div>
              Mode:{' '}
              {ganttSettings.positioningLogic === 'every-occurrence'
                ? 'Every Occurrence'
                : ganttSettings.positioningLogic === 'latest-occurrence'
                  ? 'Latest Occurrence'
                  : 'Earliest Occurrence'}
            </div>
          )}
        </div>
      </div>
      <div className={styles.actionSection}>
        <GanttSettingsModal
          onSettingsChange={() => {
            // Force settings refresh and timeline re-transformation
            setSettingsRefreshCounter((prev) => prev + 1);
          }}
        />
        <Button
          onClick={() => {
            disableTimelineView();
            // Use history to remove the hash while preserving the current URL
            const currentUrl = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', currentUrl);
          }}
          title="Return to BPMN editor view"
        >
          Back to BPMN
        </Button>
      </div>
    </div>
  );

  return (
    <div className={styles.timelineContainer}>
      <Card
        {...props}
        title={headerTitle}
        className={styles.timelineCard}
        style={props.style}
        styles={{
          body: {
            padding: 0,
            height: 'calc(100% - 80px)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Process Issues */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className={styles.issuesSection}>
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'issues',
                  label: (
                    <div className={styles.issuesHeader}>
                      <WarningOutlined className={styles.warningIcon} />
                      Process Issues
                    </div>
                  ),
                  children: (
                    <div className={styles.issuesPanel}>
                      {errors.length > 0 && (
                        <div className={styles.issueCategory}>
                          <div className={styles.issueCategoryHeader}>
                            <WarningOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                            Unsupported Elements ({errors.length})
                          </div>
                          <div className={styles.issueCategoryDescription}>
                            The following elements could not be interpreted and are excluded from
                            the timeline:
                          </div>
                          <ul className={styles.issueList}>
                            {errors.map((error, index) => (
                              <li key={`error-${index}`}>
                                <strong>{error.elementName || error.elementId}</strong> (
                                {error.elementType}): {error.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {warnings.length > 0 && (
                        <div
                          className={`${styles.issueCategory} ${errors.length > 0 ? styles.categorySpacing : ''}`}
                        >
                          <div className={styles.issueCategoryHeader}>
                            <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
                            Structural Warnings ({warnings.length})
                          </div>
                          <div className={styles.issueCategoryDescription}>
                            These process patterns are shown in the timeline but may not execute as
                            expected in a real BPMN engine:
                          </div>
                          <ul className={styles.issueList}>
                            {warnings.map((warning, index) => {
                              const elementDisplayName =
                                warning.elementName ||
                                (warning.elementType === 'bpmn:ParallelGateway'
                                  ? 'Parallel Gateway'
                                  : warning.elementType === 'bpmn:ExclusiveGateway'
                                    ? 'Exclusive Gateway'
                                    : warning.elementId);

                              return (
                                <li key={`warning-${index}`}>
                                  <strong>{elementDisplayName}</strong>: {warning.reason}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
              className={styles.collapseContainer}
            />
          </div>
        )}

        {/* Process Information */}
        {(defaultDurations.length > 0 ||
          hasInclusiveGateways ||
          hasComplexGateways ||
          hasEventBasedGateways ||
          informationalArtifacts.length > 0) && (
          <div
            className={`${styles.defaultDurationSection} ${errors.length > 0 || warnings.length > 0 ? styles.afterErrors : ''}`}
          >
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'processInfo',
                  label: (
                    <div className={styles.defaultDurationLabel}>
                      <span className={styles.infoIconInline}>ℹ</span>
                      Process Information
                    </div>
                  ),
                  children: (
                    <div className={styles.defaultDurationContent}>
                      {hasInclusiveGateways && (
                        <div className={styles.processInfoSection}>
                          <div className={styles.processInfoHeader}>
                            <strong>Inclusive Gateway Behavior</strong>
                          </div>
                          <div className={styles.processInfoDescription}>
                            This process contains inclusive gateways (OR gateways). For timeline
                            visualization, all conditional flows are assumed to be taken, showing a
                            conservative "worst-case" timeline.
                          </div>
                        </div>
                      )}

                      {hasComplexGateways && (
                        <div
                          className={`${styles.processInfoSection} ${hasInclusiveGateways ? styles.sectionSpacing : ''}`}
                        >
                          <div className={styles.processInfoHeader}>
                            <strong>Complex Gateway Behavior</strong>
                          </div>
                          <div className={styles.processInfoDescription}>
                            This process contains complex gateways with custom activation
                            expressions that cannot be evaluated during static analysis. All
                            possible paths are shown without forced synchronization, as actual
                            behavior depends on runtime conditions.
                          </div>
                        </div>
                      )}

                      {hasEventBasedGateways && (
                        <div
                          className={`${styles.processInfoSection} ${hasInclusiveGateways || hasComplexGateways ? styles.sectionSpacing : ''}`}
                        >
                          <div className={styles.processInfoHeader}>
                            <strong>Event-Based Gateway Behavior</strong>
                          </div>
                          <div className={styles.processInfoDescription}>
                            This process contains event-based gateways that consume tokens
                            immediately without synchronization. Each token independently waits for
                            events and continues when an event occurs, showing alternative execution
                            paths.
                          </div>
                        </div>
                      )}

                      {defaultDurations.length > 0 && (
                        <div
                          className={`${styles.processInfoSection} ${hasInclusiveGateways || hasComplexGateways || hasEventBasedGateways ? styles.sectionSpacing : ''}`}
                        >
                          <div className={styles.processInfoHeader}>
                            <strong>
                              Tasks with Default Duration (
                              {
                                Array.from(
                                  new Map(
                                    defaultDurations.map((item) => [item.elementId, item]),
                                  ).values(),
                                ).length
                              }
                              )
                            </strong>
                          </div>
                          <div className={styles.defaultDurationDescription}>
                            The following tasks did not have explicit durations and received the
                            default value of 1 hour:
                          </div>
                          <ul className={styles.defaultDurationList}>
                            {Array.from(
                              new Map(
                                defaultDurations.map((item) => [item.elementId, item]),
                              ).values(),
                            ).map((item, index) => (
                              <li key={index}>
                                <strong>{item.elementName || item.elementId}</strong> (
                                {item.elementType}): 1 hour
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {informationalArtifacts.length > 0 && (
                        <div
                          className={`${styles.processInfoSection} ${hasInclusiveGateways || hasComplexGateways || hasEventBasedGateways || defaultDurations.length > 0 ? styles.sectionSpacing : ''}`}
                        >
                          <div className={styles.processInfoHeader}>
                            <strong>Process Artifacts ({informationalArtifacts.length})</strong>
                          </div>
                          <div className={styles.processInfoDescription}>
                            The following informational artifacts were found in the process and are
                            not displayed in the timeline:
                          </div>
                          <ul className={styles.defaultDurationList}>
                            {informationalArtifacts.map((artifact, index) => (
                              <li key={index}>
                                <strong>{artifact.name || artifact.id}</strong> (
                                {artifact.$type === 'bpmn:TextAnnotation' && 'Text Annotation'}
                                {artifact.$type === 'bpmn:DataObject' && 'Data Object'}
                                {artifact.$type === 'bpmn:DataObjectReference' &&
                                  'Data Object Reference'}
                                {artifact.$type === 'bpmn:DataStore' && 'Data Store'}
                                {artifact.$type === 'bpmn:DataStoreReference' &&
                                  'Data Store Reference'}
                                {artifact.$type === 'bpmn:Group' && 'Group'}
                                {(artifact.$type === 'proceed:genericResource' ||
                                  artifact.$type === 'proceed:GenericResource') &&
                                  `Generic Resource${(artifact as any).resourceType ? ` - ${(artifact as any).resourceType}` : ''}`}
                                )
                                {artifact.$type === 'bpmn:TextAnnotation' &&
                                  (artifact as any).text &&
                                  `: "${(artifact as any).text}"`}
                                {artifact.$type === 'bpmn:DataObjectReference' &&
                                  (artifact as any).dataObjectRef &&
                                  ` → ${typeof (artifact as any).dataObjectRef === 'string' ? (artifact as any).dataObjectRef : (artifact as any).dataObjectRef?.id || ''}`}
                                {artifact.$type === 'bpmn:DataStoreReference' &&
                                  (artifact as any).dataStoreRef &&
                                  ` → ${typeof (artifact as any).dataStoreRef === 'string' ? (artifact as any).dataStoreRef : (artifact as any).dataStoreRef?.id || ''}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
              className={styles.defaultDurationCollapse}
            />
          </div>
        )}

        {/* Gantt Chart */}
        {!isLoading && ganttSettings && ganttData.elements.length > 0 && (
          <div className={styles.ganttSection}>
            <GanttChartCanvas
              elements={ganttData.elements}
              dependencies={ganttData.dependencies}
              currentDateMarkerTime={nowTimestamp}
              showInstanceColumn={ganttSettings.positioningLogic === 'every-occurrence'}
              showLoopColumn={
                ganttSettings.positioningLogic === 'every-occurrence' ||
                ganttSettings.positioningLogic === 'latest-occurrence' ||
                ganttSettings.positioningLogic === 'earliest-occurrence'
              }
              options={{
                showControls: true,
                autoFitToData: true,
                autoFitPadding: 0.1,
                showLoopIcons: ganttSettings.showLoopIcons,
                curvedDependencies: ganttSettings.curvedDependencies,
              }}
            />
          </div>
        )}

        {/* Loading state while settings are being fetched */}
        {!ganttSettings && <div className={styles.loadingSection}>Loading settings...</div>}

        {/* No data message */}
        {!isLoading && ganttSettings && ganttData.elements.length === 0 && errors.length === 0 && (
          <div className={styles.noDataSection}>
            No supported elements found in the BPMN process.
          </div>
        )}
      </Card>
    </div>
  );
};

export default BPMNTimeline;
